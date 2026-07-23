#!/usr/bin/env node
/**
 * The Road Back to Montrésor feature tour.
 *
 * A recorded Playwright walkthrough that creates a fiction space, organises
 * its manuscript into twelve chapters, adds two character cards in Brain
 * Space, and types the closing homecoming passage into the final chapter.
 *
 * Nothing here asserts. It exists to show the feature working, repeatably.
 *
 *   npm run dev
 *   node scripts/demo-montresor.mjs
 *   node scripts/demo-montresor.mjs --slow 600
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '.demo-tours', 'montresor');
const BASE = process.env.DEMO_URL ?? 'http://localhost:5173';

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
};

const SLOW_MO = Number(arg('slow', process.env.DEMO_SLOW_MO ?? '350'));
const TYPE_DELAY = Number(arg('type-delay', process.env.DEMO_TYPE_DELAY ?? '22'));

const CHAPTERS = [
  'The Last Letter from London',
  'A Train Before Dawn',
  'Across the Sleeping Sea',
  'Morning in Tours',
  'The Little Train to Loches',
  'The Bicycle with the Silver Bell',
  'The Road of Poppies',
  'The Château on the Hill',
  'The Blue-Shuttered Cottage',
  'Beneath the Apple Tree',
  'Grandmother Seeli Turns Around',
  'The Little Star Comes Home',
];

const CHARACTERS = [
  {
    title: 'Minette',
    body:
      'A recent graduate returning from London. Caramel skin, long dark hair ' +
      'in thick waves and loose curls, a powder-blue coat, a white dress with ' +
      'tiny pink flowers, and a rose-coloured scarf.',
  },
  {
    title: 'Grandmother Seeli',
    body:
      'Minette’s grandmother, waiting beneath the apple tree at the ' +
      'blue-shuttered cottage. Her silver-grey hair is slipping loose from ' +
      'its pins when Minette finally comes home.',
  },
];

const FINAL_PASSAGE = [
  'Overwhelmed, Minette quietly dropped her bag beside the gate and ran through the familiar house into the garden, where she stood silently and waited for her grandmother to turn.',
  'She had travelled all night from London after graduating, crossing the sea, taking the early train from Tours and cycling from Loches towards Montrésor, yet for that brief moment she forgot her exhaustion and every aching mile.',
  'Her caramel skin glowed in the morning light, her long dark hair spilled down her back in thick waves and loose curls, and her crumpled powder-blue coat rested over a white dress patterned with tiny pink flowers, with a rose-coloured scarf crooked at her neck.',
  'When Grandmother Seeli finally turned and saw her, the seeds slipped from her fingers. "Minette?" she stuttered, and Minette began to cry before falling into her arms, laughing with the joy of someone who had been away for far too long and had finally come home.',
];

const settle = (page, ms = 700) => page.waitForTimeout(ms);

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

const attachListeners = (page) => {
  page.on('pageerror', (error) => console.error(`  [pageerror] ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') console.error(`  [console] ${message.text()}`);
  });
};

const resetApp = async (page) => {
  await page.goto(`${BASE}/?reseed=1#/`);
  await page.waitForFunction(() => !globalThis.document.body.innerText.includes('Booting…'));
};

const createSpace = async (page) => {
  await page.goto(`${BASE}/#/new`);
  await page.getByTestId('templates-screen').waitFor();
  await settle(page);
  await page.getByTestId('templates-card-fiction').click();
  await page.locator('#space-name').fill('The Road Back to Montrésor');
  await page.locator('#space-tag').fill('TRM');
  await settle(page, 400);
  await page.getByTestId('templates-submit').click();
  await page.waitForURL(/#\/s\/[^/]+\/d\/[^/]+/);
  const spaceId = new URL(page.url()).hash.match(/\/s\/([^/?#]+)/)?.[1];
  if (!spaceId) throw new Error('could not resolve the new space id');
  return spaceId;
};

const manuscriptSection = (page) => {
  const sidebar = page.locator('aside').last();
  const label = page.locator('[data-testid$="-label"]', {
    hasText: /^Manuscript$/,
  });
  return sidebar.locator('[data-testid^="sidebar-section-"]').filter({ has: label });
};

const renameChapter = async (section, from, to) => {
  const link = section.getByRole('link', { name: from, exact: true });
  await link.dblclick();
  const testId = await link.getAttribute('data-testid');
  if (!testId) throw new Error(`could not resolve the sidebar id for ${from}`);
  const input = section.getByTestId(`${testId}-rename-input`);
  await input.fill(to);
  await input.press('Enter');
  await section.getByRole('link', { name: to, exact: true }).waitFor();
};

const addChapter = async (section, name) => {
  await section.getByRole('button', { name: 'Add doc to Manuscript' }).click();
  const input = section.locator('[data-testid$="-add-input"]');
  await input.waitFor();
  await input.fill(name);
  await input.press('Enter');
  await section.getByRole('link', { name, exact: true }).waitFor();
};

const organiseChapters = async (page) => {
  const section = manuscriptSection(page);
  await section.waitFor();
  const seeded = ['Chapter 01', 'Chapter 02', 'Chapter 03'];
  for (let index = 0; index < seeded.length; index += 1) {
    await renameChapter(section, seeded[index], CHAPTERS[index]);
    await settle(page, 350);
  }
  for (const chapter of CHAPTERS.slice(seeded.length)) {
    await addChapter(section, chapter);
    await settle(page, 350);
  }
};

const noteCards = (page) =>
  page
    .getByTestId('brain-canvas-content')
    .locator(':scope > [data-testid^="brain-note-"]');

const newCharacterCard = async (page) => {
  const cards = noteCards(page);
  const before = await cards.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute('data-testid')),
  );
  await page.getByTestId('brain-canvas-tool-char').click();
  const testId = await page.waitForFunction(
    ({ selector, previous }) => {
      const elements = [...globalThis.document.querySelectorAll(selector)];
      return elements
        .map((element) => element.getAttribute('data-testid'))
        .find((id) => id !== null && !previous.includes(id));
    },
    {
      selector:
        '[data-testid="brain-canvas-content"] > [data-testid^="brain-note-"]',
      previous: before,
    },
  );
  const value = await testId.jsonValue();
  if (typeof value !== 'string') {
    throw new Error('could not resolve the new character card');
  }
  return page.getByTestId(value);
};

const addCharacter = async (page, character) => {
  const card = await newCharacterCard(page);
  await card.hover();
  await card.locator('[data-testid$="-add-title"]').click();
  const title = card.locator('[data-testid$="-title-input"]');
  await title.fill(character.title);
  await title.press('Enter');
  await card.locator('[data-testid$="-body"]').click();
  const body = card.locator('[data-testid$="-body-input"]');
  await body.fill(character.body);
  await body.blur();
  await settle(page, 500);
};

const addCharacters = async (page, spaceId) => {
  await page.goto(`${BASE}/#/s/${spaceId}/brain-space`);
  await page.getByTestId('brain-canvas').waitFor();
  await settle(page);
  for (const character of CHARACTERS) await addCharacter(page, character);
};

const draftEnding = async (page) => {
  const section = manuscriptSection(page);
  const finalChapter = CHAPTERS[CHAPTERS.length - 1];
  if (!finalChapter) throw new Error('the final chapter is missing');
  await section
    .getByRole('link', { name: finalChapter, exact: true })
    .click();
  const editor = page.locator('[aria-label="Document body"]');
  await editor.waitFor();
  await editor.click();
  for (const paragraph of FINAL_PASSAGE) {
    await page.keyboard.type(paragraph, { delay: TYPE_DELAY });
    await page.keyboard.press('Enter');
    await settle(page, 400);
  }
  await settle(page, 1200);
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
    const spaceId = await createSpace(page);
    console.log(`  created The Road Back to Montrésor (${spaceId})`);
    await organiseChapters(page);
    console.log('  organised twelve manuscript chapters');
    await addCharacters(page, spaceId);
    console.log('  added Minette and Grandmother Seeli');
    await draftEnding(page);
    console.log('  drafted the final homecoming passage');
    await settle(page, 1000);
  } finally {
    await context.close();
    await browser.close();
  }

  const video = fs.readdirSync(OUT).find((file) => file.endsWith('.webm'));
  console.log(`\nTour recorded: ${video ? path.join(OUT, video) : OUT}`);
};

await main();
