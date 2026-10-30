import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

/** Writes dist/sw.js with the list of built files to keep on the device (offline use after installing). */
function serviceWorker(): Plugin {
  const outDir = resolve(__dirname, 'dist');
  const skip = /^(ocr|pdfjs|downloads)\/|^_headers$|^_redirects$|^sw\.js$|\.map$/;
  const walk = (dir: string): string[] => readdirSync(dir).flatMap(name => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [relative(outDir, full).split('\\').join('/')];
  });
  return {
    name: 'deglutech-service-worker',
    apply: 'build',
    closeBundle() {
      const files = walk(outDir).filter(f => !skip.test(f)).sort();
      const hash = createHash('sha256');
      for (const f of files) hash.update(f).update(String(statSync(join(outDir, f)).size));
      const precache = ['./', ...files.filter(f => f !== 'index.html'), 'index.html'];
      const template = readFileSync(resolve(__dirname, 'scripts/sw-template.js'), 'utf8');
      writeFileSync(join(outDir, 'sw.js'), template.replace('__VERSION__', hash.digest('hex').slice(0, 12)).replace('__PRECACHE__', JSON.stringify(precache, null, 0)));
    },
  };
}

export default defineConfig({
  plugins: [react(), serviceWorker()],
  base: './',
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
