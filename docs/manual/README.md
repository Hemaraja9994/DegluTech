# Manuals

`manual.html` (A4 user manual) and `quickstart.html` (2 pages) share `manual.css` and are paginated with
[Paged.js](https://pagedjs.org) in Playwright Chromium. Figures and tables are numbered by the build script;
cross-references are written `{{fig:id}}` / `{{tab:id}}`.

```bash
corepack pnpm --filter @laryngoos/desktop run build:web
cd apps/desktop && npx vite preview --port 4174 &          # serve the build
node tools/docs/screenshots.cjs /tmp/deglutech-shots       # demo patients + synthetic fixtures only
npm i --prefix /tmp/pagedjs pagedjs@0.4.3
npm i --prefix /tmp/fonts @fontsource/noto-sans @fontsource/crimson-pro @fontsource/noto-sans-mono \
  @fontsource/noto-sans-kannada @fontsource/noto-sans-devanagari @fontsource/noto-sans-malayalam \
  @fontsource/noto-sans-telugu @fontsource/noto-sans-tamil
SHOTS=/tmp/deglutech-shots node tools/docs/build-pdf.cjs  # → apps/desktop/public/downloads/*.pdf
```
Needs Playwright with Chromium (`require('playwright')`) and Python with Pillow. Screenshots are not committed.
Base every statement on the components in `apps/desktop/src/`. Fixtures in `tools/docs/fixtures/` are synthetic.
