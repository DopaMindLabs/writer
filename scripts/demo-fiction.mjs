#!/usr/bin/env node
/**
 * Fiction-writing feature tour.
 *
 * A recorded walkthrough, in the same shape as the multi-device harness: a
 * standalone Playwright script, deliberately outside the pass/fail test runner.
 * It creates a space from the fiction template, drafts into the editor, and
 * opens Brain Space — writing a `.webm` screencast.
 *
 * Nothing here asserts. It exists to show the feature working, repeatably.
 *
 * The prose below is PLACEHOLDER: replace `SCENES` with the real text, and fill
 * `BRAIN_NOTES` with the notes to drop on the Brain Space canvas.
 *
 *   npm run dev                                 (in another terminal)
 *   node scripts/demo-fiction.mjs
 *   node scripts/demo-fiction.mjs --slow 600    (slower, more watchable)
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '.demo-tours', 'fiction');
const BASE = process.env.DEMO_URL ?? 'http://localhost:5173';

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
};

const SLOW_MO = Number(arg('slow', process.env.DEMO_SLOW_MO ?? '350'));
const TYPE_DELAY = Number(arg('type-delay', process.env.DEMO_TYPE_DELAY ?? '22'));

// PLACEHOLDER — swap for the real manuscript text.
const SCENES = [
  'The lighthouse had been dark for eleven years, which was how everyone in the village preferred it.',
  'Mara climbed anyway, one hand on the rail, counting the turns the way her father had taught her.',
  'At the top she found the lamp cleaned, the wick trimmed, and a chair set facing the window as though someone had been waiting.',
];

// PLACEHOLDER — notes to place on the Brain Space canvas (title, body).
const BRAIN_NOTES = [
  { title: 'Mara', body: 'Keeps her father’s habits without meaning to.' },
  { title: 'The lighthouse', body: 'Dark eleven years. Someone maintains it.' },
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

/** Start from a clean database so the tour always looks the same. */
const resetApp = async (page) => {
  await page.goto(`${BASE}/?reseed=1#/`);
  await page.waitForFunction(() => !globalThis.document.body.innerText.includes('Booting…'));
};

/** Create a space from the fiction template and return its id. */
const createFictionSpace = async (page) => {
  await page.goto(`${BASE}/#/new`);
  await page.getByTestId('templates-screen').waitFor();
  await settle(page);
  await page.getByTestId('templates-card-fiction').click();
  await page.locator('#space-name').fill('The Lighthouse');
  await page.locator('#space-tag').fill('LH');
  await settle(page, 400);
  await page.getByTestId('templates-submit').click();
  await page.waitForURL(/#\/s\/[^/]+/);
  const spaceId = new URL(page.url()).hash.match(/\/s\/([^/?#]+)/)?.[1];
  if (!spaceId) throw new Error('could not resolve the new space id');
  return spaceId;
};

const draft = async (page, spaceId) => {
  await page.goto(`${BASE}/#/s/${spaceId}`);
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);
  const editor = page.locator('[aria-label="Document body"]');
  await editor.waitFor();
  await editor.click();
  for (const scene of SCENES) {
    await page.keyboard.type(scene, { delay: TYPE_DELAY });
    await page.keyboard.press('Enter');
    await settle(page, 400);
  }
  // Let the autosave debounce land before navigating away.
  await settle(page, 1200);
};

/**
 * Open Brain Space. Adding notes is left as the next step: drop `BRAIN_NOTES`
 * onto the canvas here once the interaction to use is settled.
 */
const tourBrainSpace = async (page, spaceId) => {
  await page.goto(`${BASE}/#/s/${spaceId}/brain-space`);
  await settle(page, 1200);
  console.log(`  brain space open (${String(BRAIN_NOTES.length)} notes queued for authoring)`);
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
    await resetApp(page);
    const spaceId = await createFictionSpace(page);
    console.log(`  created fiction space ${spaceId}`);
    await draft(page, spaceId);
    console.log('  drafted the opening scenes');
    await tourBrainSpace(page, spaceId);
    await settle(page, 1000);
  } finally {
    await context.close();
    await browser.close();
  }

  const video = fs.readdirSync(OUT).find((file) => file.endsWith('.webm'));
  console.log(`\nTour recorded: ${video ? path.join(OUT, video) : OUT}`);
};

await main();
