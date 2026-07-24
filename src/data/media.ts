// Media library limits and type guards, mirroring src/data/note-attachments.ts.
// Kept free of Dexie and pdfjs so both the facade and the UI can import the
// caps without pulling in the engine.

export const PDF_MIME = 'application/pdf';

/** 50 MB — the largest PDF the library accepts. */
export const MAX_PDF_BYTES = 50 * 1024 * 1024;

/** Value for a file input's `accept` attribute. */
export const PDF_ACCEPT_ATTR = PDF_MIME;

export const isPdfMime = (type: string): boolean => type === PDF_MIME;
