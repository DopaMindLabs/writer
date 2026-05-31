import { readFileSync, writeFileSync } from 'node:fs';

const RATCHET_MARGIN = 2;
const RATCHET_STEP = 5;
const METRICS = ['lines', 'statements', 'functions', 'branches'];
const SUMMARY_PATHS = {
  e2e: './e2e-coverage/coverage-summary.json',
};

const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    console.error(`coverage-ratchet: cannot read ${path}: ${String(err)}`);
    process.exit(1);
  }
};

const suite = process.argv[2] ?? 'e2e';
const summaryPath = SUMMARY_PATHS[suite];
if (!summaryPath) {
  console.error(`coverage-ratchet: unknown suite "${suite}" (known: ${Object.keys(SUMMARY_PATHS).join(', ')})`);
  process.exit(1);
}

const baseline = readJson('./coverage-baseline.json');
const summary = readJson(summaryPath);
const cap = typeof baseline.cap === 'number' ? baseline.cap : 95;
const floors = baseline[suite];
if (!floors) {
  console.error(`coverage-ratchet: coverage-baseline.json has no "${suite}" section`);
  process.exit(1);
}

const misses = [];
const raises = [];
for (const metric of METRICS) {
  const pct = summary[metric]?.pct;
  const floor = floors[metric];
  if (typeof pct !== 'number') {
    console.error(`coverage-ratchet: ${suite} summary is missing metric "${metric}"`);
    process.exit(1);
  }
  if (pct < floor) {
    misses.push(`${metric}=${pct.toFixed(2)}% (floor ${floor}%)`);
    continue;
  }
  const next = Math.min(Math.floor(pct - RATCHET_MARGIN), cap);
  if (next >= floor + RATCHET_STEP) {
    raises.push(`${metric} ${floor}% -> ${next}%`);
    floors[metric] = next;
  }
}

if (misses.length > 0) {
  console.error(`\nE2E coverage ratchet failed (coverage regressed below the locked floor):\n  ${misses.join('\n  ')}\n`);
  process.exit(1);
}

if (raises.length === 0) {
  console.log(`coverage-ratchet: ${suite} coverage holds at or above all floors.`);
  process.exit(0);
}

if (process.env.CI) {
  console.error(`\nE2E coverage improved beyond the committed floors:\n  ${raises.join('\n  ')}\nRun \`npm run test:e2e:coverage\` locally and commit the updated coverage-baseline.json to lock it in.\n`);
  process.exit(1);
}

writeFileSync('./coverage-baseline.json', `${JSON.stringify(baseline, null, 2)}\n`);
console.log(`coverage-ratchet: ${suite} floors raised: ${raises.join(', ')}`);
console.log('coverage-ratchet: coverage-baseline.json updated — commit the change to lock it in.');
