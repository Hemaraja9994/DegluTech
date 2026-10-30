// Builds the A4 DegluTech user manual and quick-start PDFs with Paged.js in Playwright Chromium.
// Usage: node tools/docs/build-pdf.cjs
// env: SHOTS (screenshots from tools/docs/screenshots.cjs), PAGEDJS (paged.polyfill.js from pagedjs@0.4.3),
//      FONTS (a node_modules folder holding @fontsource/noto-sans, crimson-pro, noto-sans-mono), OUT_DIR
const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { chromium } = require('playwright')

const ROOT = path.resolve(__dirname, '../..')
const SRC = path.join(ROOT, 'docs/manual')
const SHOTS = process.env.SHOTS || '/tmp/deglutech-shots'
const PAGEDJS = process.env.PAGEDJS || '/tmp/pagedjs/node_modules/pagedjs/dist/paged.polyfill.js'
const FONTS = process.env.FONTS || '/tmp/fonts/node_modules'
const OUT_DIR = process.env.OUT_DIR || path.join(ROOT, 'apps/desktop/public/downloads')
const BUILD = fs.mkdtempSync('/tmp/dt-manual-')
const IMG = path.join(BUILD, 'img')
fs.mkdirSync(IMG)
fs.mkdirSync(OUT_DIR, { recursive: true })

// Re-encode screenshots as JPEG (max 1600 px wide) so the PDFs stay small; derive a few crops.
const CROPS = { 'el-review-top': ['el-review', 0, 1300], 'el-release-top': ['el-release', 0, 760] }
execFileSync('python3', ['-c', `
import glob, os, sys, json
from PIL import Image
src, dst, crops = sys.argv[1], sys.argv[2], json.loads(sys.argv[3])
def save(im, name):
    im = im.convert('RGB')
    if im.width > 1600: im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
    im.save(os.path.join(dst, name + '.jpg'), quality=84, optimize=True)
for f in glob.glob(os.path.join(src, '*.png')):
    save(Image.open(f), os.path.basename(f)[:-4])
for name, (base, y0, y1) in crops.items():
    im = Image.open(os.path.join(src, base + '.png'))
    save(im.crop((0, y0, im.width, min(y1, im.height))), name)
`, SHOTS, IMG, JSON.stringify(CROPS)])

const fontFace = () => {
  const f = (pkg, file) => 'file://' + path.join(FONTS, '@fontsource', pkg, 'files', file)
  const faces = []
  for (const w of [400, 600, 700]) faces.push(`@font-face{font-family:'Noto Sans';font-weight:${w};src:url(${f('noto-sans', `noto-sans-latin-${w}-normal.woff2`)})}`)
  for (const w of [400, 600, 700]) for (const s of ['normal', 'italic']) faces.push(`@font-face{font-family:'Crimson Pro';font-weight:${w};font-style:${s};src:url(${f('crimson-pro', `crimson-pro-latin-${w}-${s}.woff2`)})}`)
  faces.push(`@font-face{font-family:'Noto Sans Mono';font-weight:400;src:url(${f('noto-sans-mono', 'noto-sans-mono-latin-400-normal.woff2')})}`)
  const scripts = [['kannada', 'U+0C80-0CFF'], ['devanagari', 'U+0900-097F'], ['malayalam', 'U+0D00-0D7F'], ['telugu', 'U+0C00-0C7F'], ['tamil', 'U+0B80-0BFF']]
  for (const fam of ['Noto Sans', 'Crimson Pro']) for (const [sc, range] of scripts) for (const w of [400, 700]) faces.push(`@font-face{font-family:'${fam}';font-weight:${w};src:url(${f('noto-sans-' + sc, `noto-sans-${sc}-${sc}-${w}-normal.woff2`)});unicode-range:${range}}`)
  return `<style>${faces.join('\n')}</style>`
}

function toc(html) {
  const items = []
  for (const m of html.matchAll(/<h([12]) id="([^"]+)"[^>]*>(.*?)<\/h\1>/g)) {
    const text = m[3].replace(/<span class="num">[^<]*<\/span>/, (n) => (n.includes('Chapter') ? n.replace(/<[^>]+>/g, '').replace('Chapter ', '') + '  ' : '')).replace(/<[^>]+>/g, '').trim()
    items.push(`<li class="${m[1] === '1' ? 'ch' : 'sec'}"><a href="#${m[2]}"><span class="t">${text}</span><span class="lead"></span></a></li>`)
  }
  return `<ol>${items.join('\n')}</ol>`
}

async function render(browser, name, out) {
  let html = fs.readFileSync(path.join(SRC, name), 'utf8')
  const missing = []
  html = html.replace(/\{\{SHOTS\}\}\/([\w-]+)\.png/g, (_, n) => { if (!fs.existsSync(path.join(IMG, n + '.jpg'))) missing.push(n); return `file://${IMG}/${n}.jpg` })
  if (missing.length) throw new Error(`${name}: missing screenshots ${missing.join(', ')}`)
  html = html.replaceAll('{{ICON}}', 'file://' + path.join(ROOT, 'apps/desktop/public/deglutech-logo.svg'))
  // Number figures and tables here (Paged.js counters can start at 0) and resolve {{fig:id}} / {{tab:id}} references.
  const nums = {}
  let fig = 0, tab = 0
  html = html.replace(/<figure([^>]*)>([\s\S]*?)<figcaption>/g, (all, attrs, body) => { fig++; const id = /id="([^"]+)"/.exec(attrs)?.[1]; if (id) nums[id] = fig; return `<figure${attrs}>${body}<figcaption><b class="fn">Figure ${fig}.</b> ` })
  html = html.replace(/<table class="num"([^>]*)><caption>/g, (all, attrs) => { tab++; const id = /id="([^"]+)"/.exec(attrs)?.[1]; if (id) nums[id] = tab; return `<table class="num"${attrs}><caption><b class="fn">Table ${tab}.</b> ` })
  html = html.replace(/\{\{(fig|tab):([\w-]+)\}\}/g, (_, k, id) => { if (!nums[id]) throw new Error(`${name}: unknown reference ${id}`); return `${k === 'fig' ? 'Figure' : 'Table'} ${nums[id]}` })
  if (html.includes('{{TOC}}')) html = html.replace('{{TOC}}', toc(html))
  html = html.replace('</head>', `${fontFace()}<script>window.PagedConfig = { auto: true, after: () => { window.__paged = true } }</script><script src="file://${PAGEDJS}"></script></head>`)
  const file = path.join(BUILD, name)
  fs.copyFileSync(path.join(SRC, 'manual.css'), path.join(BUILD, 'manual.css'))
  fs.writeFileSync(file, html)
  const page = await browser.newPage()
  page.on('pageerror', (e) => console.error('pageerror', e.message))
  await page.goto('file://' + file)
  await page.waitForFunction(() => window.__paged === true, null, { timeout: 180000 })
  const pages = await page.evaluate(() => document.querySelectorAll('.pagedjs_page').length)
  await page.pdf({ path: out, preferCSSPageSize: true, printBackground: true, outline: true, tagged: true })
  await page.close()
  console.log(`${path.basename(out)}: ${pages} pages`)
}

;(async () => {
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] })
  const only = process.argv[2]
  if (!only || only === 'manual') await render(browser, 'manual.html', path.join(OUT_DIR, 'deglutech-user-manual.pdf'))
  if (!only || only === 'quick') await render(browser, 'quickstart.html', path.join(OUT_DIR, 'deglutech-quick-start.pdf'))
  await browser.close()
})().catch((e) => { console.error(e); process.exit(1) })
