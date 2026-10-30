// Copies the on-device reading engines into public/ before each build, so PDFs and photos are read
// without any third-party server: Tesseract OCR (English, Kannada, Hindi) and PDF.js fonts/cMaps.
import { createRequire } from 'node:module';
import { cpSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, '..');
const require = createRequire(join(app, 'package.json'));
const dirOf = (pkg, from) => dirname(require.resolve(`${pkg}/package.json`, from ? { paths: [from] } : undefined));

const ocr = join(app, 'public', 'ocr');
mkdirSync(join(ocr, 'lang'), { recursive: true });
const tess = dirOf('tesseract.js');
copyFileSync(join(tess, 'dist', 'worker.min.js'), join(ocr, 'worker.min.js'));
const core = dirOf('tesseract.js-core', tess);
for (const f of ['tesseract-core-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js']) copyFileSync(join(core, f), join(ocr, f));
for (const lang of ['eng', 'kan', 'hin']) {
  const src = join(dirOf(`@tesseract.js-data/${lang}`), '4.0.0_best_int', `${lang}.traineddata.gz`);
  copyFileSync(src, join(ocr, 'lang', `${lang}.traineddata.gz`));
}
const pdf = dirOf('pdfjs-dist');
const pdfOut = join(app, 'public', 'pdfjs');
for (const d of ['cmaps', 'standard_fonts']) if (existsSync(join(pdf, d))) cpSync(join(pdf, d), join(pdfOut, d), { recursive: true });
console.log('Reader assets copied to public/ocr and public/pdfjs');
