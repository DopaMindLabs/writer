export const MAX_PDF_BYTES = 50 * 1024 * 1024;

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46] as const;

export const sniffPdfMagic = async (blob: Blob): Promise<boolean> => {
  const head = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
  if (head.length < 4) return false;
  for (let i = 0; i < PDF_MAGIC.length; i += 1) {
    if (head[i] !== PDF_MAGIC[i]) return false;
  }
  return true;
};

interface PdfDocLike {
  numPages: number;
  destroy: () => Promise<void>;
}

interface PdfjsLike {
  getDocument: (args: { data: ArrayBuffer }) => { promise: Promise<PdfDocLike> };
  GlobalWorkerOptions?: { workerSrc?: string };
}

// pdfjs needs a worker configured before getDocument is ever called. The viewer
// sets it on mount, but counting pages can run first (e.g. on upload), so make
// the worker self-configuring here too. Same-origin bundle, allowed by CSP
// worker-src 'self'. Guarded so the mocked module used in unit tests is a no-op.
const readWorkerOptions = (
  mod: PdfjsLike,
): { workerSrc?: string } | undefined => {
  // Unit tests mock pdfjs-dist without this export; accessing a missing named
  // export on a Vitest module mock throws, so read it defensively.
  try {
    return mod.GlobalWorkerOptions;
  } catch {
    return undefined;
  }
};

const ensurePdfWorker = (mod: PdfjsLike): void => {
  if (typeof window === 'undefined') return;
  const options = readWorkerOptions(mod);
  if (!options || options.workerSrc) return;
  options.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
};

export const countPages = async (blob: Blob): Promise<number> => {
  const mod = (await import('pdfjs-dist')) as unknown as PdfjsLike;
  ensurePdfWorker(mod);
  const doc = await mod.getDocument({ data: await blob.arrayBuffer() }).promise;
  try {
    return doc.numPages;
  } finally {
    await doc.destroy();
  }
};
