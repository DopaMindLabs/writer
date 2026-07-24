// The single seam between the app and react-pdf. Every other module imports the
// engine from here, so unit tests and stories mock exactly this file (never
// react-pdf or pdfjs-dist directly) and real pdfjs runs only in the browser and
// e2e. Keep this file logic-free — a pure re-export plus react-pdf's own layer
// stylesheets — so the mock stays honest.
//
// These side-effect CSS imports live here, and only here, because this is the
// one module that loads real react-pdf: mocks replace this file, so the styles
// never leak into unit tests (Vitest also runs with `css: false`). Without them
// the text layer has no positioning and renders as opaque glyphs stacked below
// the canvas instead of a transparent, selectable overlay — text selection (and
// therefore highlighting) is broken. The annotation-layer sheet is react-pdf's
// documented standard setup and guards the same failure mode if that layer is
// ever enabled.
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

export { Document, Page, pdfjs } from 'react-pdf';
export type { DocumentProps, PageProps } from 'react-pdf';
