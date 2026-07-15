#!/usr/bin/env node
/**
 * Multi-device cloud-sync harness.
 *
 * Drives N real Chromium profiles — each one a distinct device, with its own
 * IndexedDB and localStorage — against a **real** Dexie Cloud account, and reports
 * what crossed the wire. It exists because the bugs that matter here only appear
 * against a live server: the e2e build points at `cloud.example.invalid`, where no
 * sync round ever settles, so the sync engine's write path is unreachable in CI.
 *
 * The check that earns its keep is the sync-rate ceiling. An unconditional write
 * to a synced table pushes, the push settles the sync round, the settle re-triggers
 * the writer, and it writes again — an unbounded loop. It is invisible in a unit
 * test and looks, in the browser, merely like a UI that flashes and hangs. Here it
 * shows up as a device sitting on hundreds of `/sync` requests per minute.
 *
 * Not wired into CI: it needs a real account and a live one-time code from an inbox.
 *
 *   node scripts/cloud-device-harness.mjs --devices 3
 *   node scripts/cloud-device-harness.mjs --purge      (wipe the account's rows)
 */
import { chromium } from '@playwright/test';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '.cloud-harness');
const BASE = process.env.HARNESS_URL ?? 'http://localhost:5173';

/**
 * A device that is merely syncing should settle in a handful of rounds. Hundreds
 * is not "busy", it is a loop — the failure this harness exists to catch.
 */
const SYNC_CEILING = 25;

const ask = async (question) => {
  const rl = createInterface({ input: stdin, output: stdout });
  const answer = await rl.question(question);
  rl.close();
  return answer.trim();
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wait for a one-time code, from a human at a terminal or from a file.
 *
 * The file path matters: an agent runs this with no TTY, and the code lives in a
 * mailbox it cannot read. Polling a file lets it ask the user for the code and drop
 * it in, instead of the run simply hanging on a prompt nobody can see.
 */
const askOtp = async (name, email) => {
  const prompt = `  [${name}] one-time code sent to ${email}`;
  if (stdin.isTTY) return ask(`${prompt}: `);

  const file = path.join(OUT, `otp-${name}.txt`);
  fs.rmSync(file, { force: true });
  console.log(`${prompt}\n  [${name}] no terminal — write the code to: ${file}`);
  for (;;) {
    if (fs.existsSync(file)) {
      const code = fs.readFileSync(file, 'utf8').trim();
      if (code) {
        fs.rmSync(file, { force: true });
        return code;
      }
    }
    await sleep(2000);
  }
};

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};

const readEnvLocal = () => {
  const file = path.join(ROOT, '.env.local');
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .filter((line) => line.trim() && !line.startsWith('#'))
      .map((line) => {
        const at = line.indexOf('=');
        return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
      }),
  );
};

/** Per-device counters, fed by the request/console listeners. */
const newStats = () => ({
  syncPosts: 0,
  blobGets: 0,
  consoleLines: 0,
  errors: new Map(),
});

const attachListeners = (page, name, stats) => {
  const log = (file, line) =>
    fs.appendFileSync(path.join(OUT, `${file}-${name}.log`), `${line}\n`);

  page.on('console', (message) => {
    stats.consoleLines += 1;
    const text = message.text().slice(0, 300);
    if (message.type() === 'error' || message.type() === 'warning') {
      const key = text.slice(0, 120);
      stats.errors.set(key, (stats.errors.get(key) ?? 0) + 1);
    }
    log('console', `[${message.type()}] ${text}`);
  });
  page.on('pageerror', (error) => log('console', `[pageerror] ${error.message}`));
  page.on('request', (request) => {
    const url = request.url();
    if (!url.includes('dexie.cloud')) return;
    if (url.endsWith('/sync')) stats.syncPosts += 1;
    if (url.includes('/blob/')) stats.blobGets += 1;
    log('net', `${request.method()} ${url}`);
  });
};

const openDevice = async (name) => {
  const context = await chromium.launchPersistentContext(
    path.join(OUT, `profile-${name}`),
    { headless: true, viewport: { width: 1280, height: 900 } },
  );
  const page = context.pages()[0] ?? (await context.newPage());
  const stats = newStats();
  attachListeners(page, name, stats);
  await page.goto(`${BASE}/#/settings`);
  await page.getByRole('button', { name: 'Account' }).click();
  return { name, context, page, stats };
};

/** Sign a device in, relaying the one-time code from the operator's inbox. */
const signIn = async (device, email) => {
  await device.page.getByTestId('cloud-sign-in').click();
  await device.page.getByTestId('cloud-login-input').fill(email);
  await device.page.getByTestId('cloud-login-submit').click();
  await device.page.getByTestId('cloud-login-dialog').waitFor();

  const otp = await askOtp(device.name, email);
  await device.page.getByTestId('cloud-login-input').fill(otp);
  await device.page.getByTestId('cloud-login-submit').click();
  await device.page.getByTestId('cloud-login-dialog').waitFor({ state: 'detached' });
};

/** Unlock a device with the account passphrase, if it is offered. */
const unlock = async (device, passphrase) => {
  const unlockNow = device.page.getByTestId('cloud-unlock');
  if ((await unlockNow.count()) === 0) return false;
  await unlockNow.first().click();
  await device.page.getByTestId('unlock-input').fill(passphrase);
  await device.page.getByTestId('unlock-submit').click();
  await device.page.getByTestId('unlock-input').waitFor({ state: 'detached' });
  return true;
};

/** Everything the account holds, read straight from the device's own database. */
const readAccount = (page) =>
  page.evaluate(async () => {
    const db = globalThis.db;
    return {
      docs: await db.docs.count(),
      spaces: await db.spaces.count(),
      devices: (await db.cloudDevices.toArray()).map((row) => ({
        id: String(row.id).slice(0, 10),
        lastSeenAt: row.lastSeenAt,
        revokedAt: row.revokedAt,
      })),
    };
  });

/**
 * Delete every synced row and the device registry, then push. Dexie-level deletes,
 * never raw IndexedDB: only a Dexie mutation is queued for the server, so a raw
 * delete would wipe the device and leave the account untouched.
 */
const purge = (page) =>
  page.evaluate(async () => {
    const db = globalThis.db;
    const tables = [
      'docs', 'notes', 'noteAttachments', 'annotations', 'citations',
      'connections', 'revisions', 'sections', 'spaces', 'palettes',
      'cloudDevices', 'cloudCrypto',
    ];
    const removed = {};
    for (const name of tables) {
      const keys = await db[name].toCollection().primaryKeys();
      removed[name] = keys.length;
      if (keys.length) await db[name].bulkDelete(keys);
    }
    await db.cloud.sync({ purpose: 'push', wait: true });
    return removed;
  });

const report = (devices) => {
  console.log('\n── Per-device traffic ──');
  let failed = false;
  for (const { name, stats } of devices) {
    const verdict = stats.syncPosts > SYNC_CEILING ? 'LOOP' : 'ok';
    if (verdict === 'LOOP') failed = true;
    console.log(
      `  ${name}: ${stats.syncPosts} sync, ${stats.blobGets} blob, ` +
        `${stats.consoleLines} console lines — ${verdict}`,
    );
    const top = [...stats.errors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    for (const [message, count] of top) console.log(`      ${count}× ${message}`);
  }
  if (failed) {
    console.error(
      `\n✘ A device exceeded ${SYNC_CEILING} sync requests. That is a sync loop, ` +
        'not a busy device: something is writing to a synced table on every settle.',
    );
  } else {
    console.log('\n✔ No sync loop: every device settled well inside the ceiling.');
  }
  console.log(`\nLogs: ${OUT}`);
  return failed;
};

const main = async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const env = readEnvLocal();
  if (!env.VITE_DEXIE_CLOUD_URL) {
    console.error('.env.local needs VITE_DEXIE_CLOUD_URL (and VITE_CLOUD_SYNC_FLAG=on).');
    process.exit(1);
  }
  console.log(`Account database: ${env.VITE_DEXIE_CLOUD_URL}`);
  console.log(`Dev server:       ${BASE}  (run \`npm run dev\` first)\n`);

  const wantPurge = process.argv.includes('--purge');
  const count = wantPurge ? 1 : Number(arg('devices', '')) || Number(await ask('How many devices? '));
  const email = arg('email', '') || (await ask('Account email: '));
  const passphrase = wantPurge ? '' : arg('passphrase', '') || (await ask('Account passphrase: '));

  const devices = [];
  for (let i = 0; i < count; i += 1) {
    const name = String.fromCharCode(65 + i);
    console.log(`\n[${name}] opening…`);
    const device = await openDevice(name);
    devices.push(device);
    await signIn(device, email);
    console.log(`  [${name}] signed in`);
  }

  if (wantPurge) {
    const removed = await purge(devices[0].page);
    console.log('\nPurged and pushed:', removed);
  } else {
    for (const device of devices) {
      const unlocked = await unlock(device, passphrase);
      console.log(`  [${device.name}] ${unlocked ? 'unlocked' : 'no key to unlock'}`);
    }
    console.log('\nIdling 60s to let any sync loop show itself…');
    await devices[0].page.waitForTimeout(60_000);
    for (const device of devices) {
      console.log(`\n[${device.name}]`, await readAccount(device.page));
    }
  }

  const failed = report(devices);
  for (const device of devices) await device.context.close();
  process.exit(failed ? 1 : 0);
};

await main();
