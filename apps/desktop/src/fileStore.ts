// Patient files (PDFs, photos, scans, instrument outputs, images and videos) kept in this browser's
// IndexedDB, which holds far more than the 5 MB page storage. Nothing is uploaded anywhere.
export type FileKind = 'pdf' | 'image' | 'video' | 'text' | 'other';
export type StoredFile = {
  id: string;
  patientId: string;
  name: string;
  type: string;
  size: number;
  kind: FileKind;
  addedAt: string;
  blob: Blob;
  /** Text read from the file (PDF text layer or OCR), kept so it can be re-checked without re-reading. */
  text?: string;
  readMethod?: 'pdf-text' | 'ocr' | 'text' | 'none';
  appliedFields?: string[];
};
export type FileMeta = Omit<StoredFile, 'blob'>;

const DB = 'deglutech-files';
const STORE = 'files';
export const MAX_FILE_BYTES = 60 * 1024 * 1024;

export function kindOf(type: string, name: string): FileKind {
  if (type === 'application/pdf' || /\.pdf$/i.test(name)) return 'pdf';
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('text/') || /\.(txt|csv|tsv|log)$/i.test(name)) return 'text';
  return 'other';
}

let dbPromise: Promise<IDBDatabase> | null = null;
function db(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') { reject(new Error('This browser cannot store files (IndexedDB unavailable).')); return; }
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => {
        const s = req.result.createObjectStore(STORE, { keyPath: 'id' });
        s.createIndex('patientId', 'patientId', { unique: false });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('File storage could not be opened.'));
    });
    dbPromise.catch(() => { dbPromise = null; });
  }
  return dbPromise;
}
function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then(d => new Promise<T>((resolve, reject) => {
    const tx = d.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error ?? req.error ?? new Error('File storage error'));
    tx.onabort = () => reject(tx.error ?? new Error('File storage is full. Delete files or free browser space.'));
  }));
}

export const putFile = (f: StoredFile) => run('readwrite', s => s.put(f)).then(() => f);
export const getFile = (id: string) => run<StoredFile | undefined>('readonly', s => s.get(id));
export const deleteFile = (id: string) => run('readwrite', s => s.delete(id)).then(() => undefined);
export async function listFiles(patientId: string): Promise<FileMeta[]> {
  const all = await run<StoredFile[]>('readonly', s => s.index('patientId').getAll(patientId));
  return all.map(({ blob: _blob, ...meta }) => meta).sort((a, b) => b.addedAt.localeCompare(a.addedAt));
}
export async function updateFile(id: string, patch: Partial<Omit<StoredFile, 'id' | 'patientId' | 'blob'>>) {
  const f = await getFile(id); if (!f) return;
  await putFile({ ...f, ...patch });
}
export async function deletePatientFiles(patientId: string) {
  const files = await run<StoredFile[]>('readonly', s => s.index('patientId').getAll(patientId));
  for (const f of files) await deleteFile(f.id);
  return files.length;
}
export async function allFiles(): Promise<StoredFile[]> {
  return run<StoredFile[]>('readonly', s => s.getAll());
}
/** Asks the browser not to evict stored files when space runs low (best effort). */
export async function requestPersistence(): Promise<boolean> {
  try { return (await navigator.storage?.persist?.()) ?? false; } catch { return false; }
}
export async function storageEstimate(): Promise<{ usedMb: number; quotaMb: number } | null> {
  try { const e = await navigator.storage?.estimate?.(); return e ? { usedMb: Math.round((e.usage ?? 0) / 1e6), quotaMb: Math.round((e.quota ?? 0) / 1e6) } : null; } catch { return null; }
}

// ---- backups: files travel as base64 inside the backup JSON
export type BackupFile = Omit<StoredFile, 'blob'> & { data: string };
export async function fileToBackup(f: StoredFile): Promise<BackupFile> {
  const buf = new Uint8Array(await f.blob.arrayBuffer());
  let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  const { blob: _b, ...meta } = f;
  return { ...meta, data: btoa(bin) };
}
export function backupToFile(b: unknown): StoredFile | null {
  if (!b || typeof b !== 'object') return null;
  const r = b as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.patientId !== 'string' || typeof r.name !== 'string' || typeof r.data !== 'string') return null;
  try {
    const bin = atob(r.data); const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    const type = typeof r.type === 'string' ? r.type : 'application/octet-stream';
    return {
      id: r.id, patientId: r.patientId, name: r.name.slice(0, 200), type, size: buf.length, kind: kindOf(type, r.name),
      addedAt: typeof r.addedAt === 'string' ? r.addedAt : new Date().toISOString(), blob: new Blob([buf], { type }),
      ...(typeof r.text === 'string' ? { text: r.text.slice(0, 500_000) } : {}),
      ...(Array.isArray(r.appliedFields) ? { appliedFields: r.appliedFields.filter((x): x is string => typeof x === 'string') } : {}),
    };
  } catch { return null; }
}
export const newFileId = () => `f-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
