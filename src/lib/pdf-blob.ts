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
}

export const countPages = async (blob: Blob): Promise<number> => {
  const mod = (await import('pdfjs-dist')) as unknown as PdfjsLike;
  const doc = await mod.getDocument({ data: await blob.arrayBuffer() }).promise;
  try {
    return doc.numPages;
  } finally {
    await doc.destroy();
  }
};
