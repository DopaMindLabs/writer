#!/usr/bin/env node
/**
 * Scientific-writing feature tour.
 *
 * A recorded walkthrough, in the same shape as the multi-device harness: a
 * standalone Playwright script, deliberately outside the pass/fail test runner.
 * It drives a real Chromium profile through the research flow — seeded space,
 * drafting in the editor, then the citations workflow (add references, sort,
 * select, and remove an unused source) — and writes a `.webm` screencast.
 *
 * Nothing here asserts. It exists to show the feature working, repeatably.
 *
 *   npm run dev                                    (in another terminal)
 *   node scripts/demo-scientific.mjs
 *   node scripts/demo-scientific.mjs --slow 600    (slower, more watchable)
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '.demo-tours', 'scientific');
const BASE = process.env.DEMO_URL ?? 'http://localhost:5173';

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
};

const SLOW_MO = Number(arg('slow', process.env.DEMO_SLOW_MO ?? '350'));
const TYPE_DELAY = Number(arg('type-delay', process.env.DEMO_TYPE_DELAY ?? '22'));

const PARAGRAPHS = [
  'Differential expression was assessed across the three treatment arms with DESeq2, using moderated estimation of fold change and dispersion (Love et al., 2014).',
  'Genes passing the adjusted significance threshold clustered into two coherent programmes. The result was compared with an edgeR analysis based on negative-binomial models (Robinson et al., 2010).',
  'The remaining variance tracked batch rather than condition, so batch was retained as a covariate throughout.',
];

const CITATIONS = [
  '@article{love2014deseq2, author={Love, Michael I. and Huber, Wolfgang and Anders, Simon}, title={Moderated estimation of fold change and dispersion for RNA-seq data with DESeq2}, journal={Genome Biology}, year={2014}, volume={15}, pages={550}, doi={10.1186/s13059-014-0550-8}}',
  '@article{robinson2010edger, author={Robinson, Mark D. and McCarthy, Davis J. and Smyth, Gordon K.}, title={edgeR: a Bioconductor package for differential expression analysis of digital gene expression data}, journal={Bioinformatics}, year={2010}, volume={26}, number={1}, pages={139--140}, doi={10.1093/bioinformatics/btp616}}',
  '@article{wolf2018scanpy, author={Wolf, F. Alexander and Angerer, Philipp and Theis, Fabian J.}, title={SCANPY: large-scale single-cell gene expression data analysis}, journal={Genome Biology}, year={2018}, volume={19}, pages={15}, doi={10.1186/s13059-017-1382-0}}',
];

const settle = (page, ms = 700) => page.waitForTimeout(ms);

/**
 * Mark the guided tours complete before the app boots. Their driver.js overlay
 * covers the viewport and intercepts every click, so a tour would stall the run.
 */
const suppressTours = (page) =>
  page.addInitScript(
    ({ key, ids }) => {
      try {
        globalThis.localStorage.setItem(
          key,
          JSON.stringify({ version: 1, completed: ids }),
        );
      } catch {
        /* storage disabled — the tour just plays */
      }
    },
    { key: 'lipsum-tours', ids: ['welcome', 'writer', 'citations', 'brainspace'] },
  );

/** Surface page errors so a broken tour is obvious rather than silently short. */
const attachListeners = (page) => {
  page.on('pageerror', (error) => console.error(`  [pageerror] ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') console.error(`  [console] ${message.text()}`);
  });
};

/** Reseed to a deterministic research space and return its id. */
const seedSpace = async (page) => {
  await page.goto(`${BASE}/?reseed=1#/`);
  await page.waitForFunction(() => !globalThis.document.body.innerText.includes('Booting…'));
  const href = await page
    .getByRole('link', { name: /Continue writing/i })
    .getAttribute('href');
  const spaceId = href?.match(/\/s\/([^/?#]+)/)?.[1];
  if (!spaceId) throw new Error('could not resolve the seeded space id');
  return spaceId;
};

const draft = async (page, spaceId) => {
  await page.goto(`${BASE}/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);
  const editor = page.locator('[aria-label="Document body"]');
  await editor.waitFor();
  await editor.click();
  for (const paragraph of PARAGRAPHS) {
    await page.keyboard.type(paragraph, { delay: TYPE_DELAY });
    await page.keyboard.press('Enter');
    await settle(page, 400);
  }
  // Let the autosave debounce land before navigating away.
  await settle(page, 1200);
};

const addCitation = async (page, bibtex) => {
  await page.getByRole('button', { name: '+ add' }).click();
  const form = page.getByTestId('citations-manual-add');
  await form.waitFor();
  await page.getByTestId('citations-manual-add-input').fill(bibtex);
  await page.getByTestId('citations-manual-add-submit').click();
  await form.waitFor({ state: 'hidden' });
  await settle(page, 600);
};

const removeUnusedCitation = async (page) => {
  const row = page.getByRole('button', {
    name: 'View citation wolf2018scanpy',
  });
  await row.click();
  const detail = page
    .locator('[data-testid^="citation-detail-"]')
    .filter({ hasText: 'SCANPY' });
  await detail.waitFor();
  page.once('dialog', (dialog) => void dialog.accept());
  await detail.locator('[data-testid$="-delete"]').click();
  await row.waitFor({ state: 'detached' });
  await settle(page, 700);
};

const tourCitations = async (page, spaceId) => {
  await page.goto(`${BASE}/#/s/${spaceId}/citations`);
  await page.getByTestId('citations-pane').waitFor();
  await settle(page);

  for (const bibtex of CITATIONS) await addCitation(page, bibtex);

  const year = page.getByRole('button', { name: /year/i }).first();
  if (await year.count()) {
    await year.click();
    await settle(page);
  }

  const selectBoxes = page.locator('[data-testid$="-select-box"]');
  const total = await selectBoxes.count();
  for (let i = 0; i < Math.min(total, 2); i += 1) {
    await selectBoxes.nth(i).click();
    await settle(page, 500);
  }

  const clear = page.getByTestId('citations-bulk-clear');
  if (await clear.count()) {
    await clear.click();
    await settle(page);
  }

  await removeUnusedCitation(page);
};

const main = async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  console.log(`Target:   ${BASE}  (run \`npm run dev\` first)`);
  console.log(`Recording to: ${OUT}\n`);

  const browser = await chromium.launch({ slowMo: SLOW_MO });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: OUT, size: { width: 1440, height: 900 } },
  });
  const page = await context.newPage();
  attachListeners(page);
  await suppressTours(page);

  try {
    const spaceId = await seedSpace(page);
    console.log(`  seeded space ${spaceId}`);
    await draft(page, spaceId);
    console.log('  drafted the results section');
    await tourCitations(page, spaceId);
    console.log('  added cited sources and removed the unused reference');
    await settle(page, 1000);
  } finally {
    await context.close();
    await browser.close();
  }

  const video = fs.readdirSync(OUT).find((file) => file.endsWith('.webm'));
  console.log(`\nTour recorded: ${video ? path.join(OUT, video) : OUT}`);
};

await main();
