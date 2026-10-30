// Reads text out of files on this device: PDF text layer (PDF.js), OCR for scanned pages and photos
// (Tesseract, English/Kannada/Hindi), plain text for instrument exports such as Praat reports.
// The engines are served from this site (public/ocr, public/pdfjs); the files never leave the browser.
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { FileKind } from './fileStore';

export type OcrLanguage = 'eng' | 'eng+kan' | 'eng+hin';
export type ReadResult = { text: string; method: 'pdf-text' | 'ocr' | 'text' | 'none'; pages?: number; ocrPages?: number };
type Progress = (message: string) => void;

const asset = (path: string) => new URL(`${(import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? './'}${path}`, window.location.href).href;
const MAX_PAGES = 40;

type OcrWorker = { recognize: (img: HTMLCanvasElement | Blob) => Promise<{ data: { text: string } }>; terminate: () => Promise<unknown> };
let worker: { lang: OcrLanguage; w: Promise<OcrWorker> } | null = null;
let idle: number | undefined;
let currentProgress: Progress = () => {};
async function ocrWorker(lang: OcrLanguage): Promise<OcrWorker> {
  window.clearTimeout(idle);
  if (worker && worker.lang !== lang) { const old = worker.w; worker = null; old.then(w => w.terminate()).catch(() => undefined); }
  if (!worker) {
    const { createWorker } = await import('tesseract.js');
    const w = createWorker(lang, 1, {
      workerPath: asset('ocr/worker.min.js'),
      corePath: asset('ocr/'),
      langPath: asset('ocr/lang'),
      gzip: true,
      logger: (m: { status: string; progress: number }) => {
        if (m.status === 'recognizing text') currentProgress(`Recognising text ${Math.round(m.progress * 100)}%`);
        else if (/load|initiali/.test(m.status)) currentProgress('Preparing text recognition (first time only)…');
      },
    }) as unknown as Promise<OcrWorker>;
    worker = { lang, w };
    w.catch(() => { worker = null; });
  }
  return worker.w;
}
function scheduleRelease() {
  window.clearTimeout(idle);
  idle = window.setTimeout(() => { const w = worker; worker = null; w?.w.then(x => x.terminate()).catch(() => undefined); }, 120_000);
}

async function ocr(img: HTMLCanvasElement | Blob, lang: OcrLanguage, progress: Progress): Promise<string> {
  currentProgress = progress;
  const w = await ocrWorker(lang);
  const { data } = await w.recognize(img);
  scheduleRelease();
  return data.text;
}

async function readPdf(blob: Blob, lang: OcrLanguage, progress: Progress): Promise<ReadResult> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(await blob.arrayBuffer()),
    cMapUrl: asset('pdfjs/cmaps/'), cMapPacked: true, standardFontDataUrl: asset('pdfjs/standard_fonts/'),
    isEvalSupported: false,
  }).promise;
  const pages = Math.min(doc.numPages, MAX_PAGES);
  const parts: string[] = [];
  let ocrPages = 0;
  for (let n = 1; n <= pages; n++) {
    progress(`Reading page ${n} of ${pages}`);
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    let pageText = '';
    for (const item of content.items as { str?: string; hasEOL?: boolean }[]) {
      if (typeof item.str !== 'string') continue;
      pageText += item.str + (item.hasEOL ? '\n' : ' ');
    }
    if (pageText.replace(/\s/g, '').length < 40) {
      // scanned page: render it and recognise the text
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
      await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
      pageText = await ocr(canvas, lang, m => progress(`Page ${n} of ${pages}: ${m}`));
      ocrPages++;
    }
    parts.push(pageText);
    page.cleanup();
  }
  await doc.destroy();
  return { text: parts.join('\n\n'), method: ocrPages ? 'ocr' : 'pdf-text', pages, ocrPages };
}

export async function readFileText(blob: Blob, kind: FileKind, lang: OcrLanguage, progress: Progress): Promise<ReadResult> {
  if (kind === 'text') return { text: await blob.text(), method: 'text' };
  if (kind === 'pdf') return readPdf(blob, lang, progress);
  if (kind === 'image') { progress('Recognising text…'); return { text: await ocr(blob, lang, progress), method: 'ocr' }; }
  return { text: '', method: 'none' };
}
