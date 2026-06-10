// Self-hosted fonts (no third-party requests, works offline): the three DS
// families at the weights the app uses — Geist 300–700, Source Serif 4
// 300–600 (+400 italic), Geist Mono 400/500. Imported as JS so Vite resolves
// and fingerprints the woff2 assets (a CSS-level @import through the Tailwind
// pipeline does not rebase the relative font URLs).
import '@fontsource/geist/300.css';
import '@fontsource/geist/400.css';
import '@fontsource/geist/500.css';
import '@fontsource/geist/600.css';
import '@fontsource/geist/700.css';
import '@fontsource/source-serif-4/300.css';
import '@fontsource/source-serif-4/400.css';
import '@fontsource/source-serif-4/400-italic.css';
import '@fontsource/source-serif-4/500.css';
import '@fontsource/source-serif-4/600.css';
import '@fontsource/geist-mono/400.css';
import '@fontsource/geist-mono/500.css';
