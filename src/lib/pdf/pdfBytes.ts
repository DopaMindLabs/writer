import { pdfjs } from './pdfAdapter';
import { ensurePdfWorker } from './pdfWorker';

// The %PDF signature every valid PDF begins with.
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46] as const;

/** True when the blob starts with the %PDF magic bytes. */
export const sniffPdfMagic = async (blob: Blob): Promise<boolean> => {
  const head = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
  if (head.length < PDF_MAGIC.length) return false;
  return PDF_MAGIC.every((byte, index) => head[index] === byte);
};

/**
 * Returns an independent copy of the bytes. pdfjs transfers and detaches the
 * buffer it is handed, so every consumer must receive a fresh copy from the
 * retained master buffer — never the master itself.
 */
export const clonePdfBytes = (buffer: ArrayBuffer): Uint8Array =>
  new Uint8Array(buffer.slice(0));

/**
 * Opens the PDF to read its page count, then always destroys the loading task.
 * Throws when the bytes cannot be parsed, which callers treat as a corrupt file.
 */
export const countPdfPages = async (blob: Blob): Promise<number> => {
  ensurePdfWorker();
  const task = pdfjs.getDocument({ data: clonePdfBytes(await blob.arrayBuffer()) });
  try {
    const doc = await task.promise;
    return doc.numPages;
  } finally {
    await task.destroy();
  }
};
