// Generates the deterministic PDF fixtures the e2e suite uploads and renders.
// The binaries are committed; re-running this script must produce byte-identical
// output (enforced by the P0.3 acceptance: `node scripts/make-pdf-fixtures.mjs
// && git diff --exit-code e2e/fixtures`). Determinism comes from pinning every
// metadata field that would otherwise default to the current time.
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const FIXTURES_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'e2e',
  'fixtures',
);

// A fixed instant so CreationDate/ModDate never vary between runs.
const FIXED_DATE = new Date('2026-01-01T00:00:00Z');
const METADATA_TAG = 'lipsum-writer-fixtures';
const A4 = [595.28, 841.89];
const TEXT = { x: 56, y: A4[1] - 96, size: 24 };

const applyFixedMetadata = (doc) => {
  doc.setTitle('');
  doc.setAuthor('');
  doc.setSubject('');
  doc.setKeywords([]);
  doc.setProducer(METADATA_TAG);
  doc.setCreator(METADATA_TAG);
  doc.setCreationDate(FIXED_DATE);
  doc.setModificationDate(FIXED_DATE);
};

const buildDocument = async (lines) => {
  const doc = await PDFDocument.create();
  applyFixedMetadata(doc);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const line of lines) {
    const page = doc.addPage(A4);
    page.drawText(line, { x: TEXT.x, y: TEXT.y, size: TEXT.size, font });
  }
  // Object streams add compression that varies across pdf-lib internals; plain
  // cross-reference tables keep the output stable and diffable.
  return doc.save({ useObjectStreams: false });
};

const main = async () => {
  mkdirSync(FIXTURES_DIR, { recursive: true });

  const tiny = await buildDocument(['Lorem ipsum highlights beautifully.']);
  writeFileSync(join(FIXTURES_DIR, 'tiny.pdf'), tiny);

  const twoPage = await buildDocument([
    'Page one of the fixture.',
    'Page two of the fixture.',
  ]);
  writeFileSync(join(FIXTURES_DIR, 'two-page.pdf'), twoPage);

  // Truncated PDF: keeps the leading %PDF- signature (so magic sniffing passes)
  // but is cut short, so parsing fails — exercises the loader's error branch.
  const corrupt = Buffer.from(tiny).subarray(0, 400);
  writeFileSync(join(FIXTURES_DIR, 'corrupt.pdf'), corrupt);
};

await main();
