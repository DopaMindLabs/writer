// The single seam between the app and react-pdf. Every other module imports the
// engine from here, so unit tests and stories mock exactly this file (never
// react-pdf or pdfjs-dist directly) and real pdfjs runs only in the browser and
// e2e. Keep this file a pure re-export — no logic — so the mock stays honest.
export { Document, Page, pdfjs } from 'react-pdf';
export type { DocumentProps, PageProps } from 'react-pdf';
