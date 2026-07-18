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
import {
  classifyKeyState,
  isErrorKeyState,
  KEY_STATE_TESTIDS,
} from './cloudDeviceKeyState.mjs';

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

/** Poll `predicate` on a bounded interval until it is truthy, or throw on timeout. */
const sampleUntil = async (predicate, { label, timeoutMs = 30_000, intervalMs = 500 }) => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await predicate();
    if (value) return value;
    if (Date.now() >= deadline) {
      throw new Error(`Timed out after ${timeoutMs}ms waiting for: ${label}`);
    }
    await sleep(intervalMs);
  }
};

/** The cloud key-state testids currently visible on a device's page. */
const presentKeyTestIds = async (page) => {
  const present = [];
  for (const id of KEY_STATE_TESTIDS) {
    if ((await page.getByTestId(id).count()) > 0) present.push(id);
  }
  return present;
};

/** Drive the signed-in-keyless setup flow to completion, ending on `cloud-forget`. */
const completeSetup = async (page, passphrase) => {
  await page.getByTestId('cloud-keyless-nokey').getByRole('button').first().click();
  await page.getByTestId('passphrase-setup-dialog').waitFor();
  await page.getByTestId('passphrase-input').fill(passphrase);
  await page.getByTestId('passphrase-confirm').fill(passphrase);
  await page.getByTestId('passphrase-submit').click();
  // Acknowledge the one-time recovery code the setup shows.
  await page.getByTestId('recovery-code-dialog').waitFor();
  await page.getByTestId('recovery-confirm').click();
  await page.getByTestId('recovery-done').click();
};

/** Unlock a signed-in-keyless device through its keyless banner, ending on `cloud-forget`. */
const completeUnlock = async (page, passphrase) => {
  await page.getByTestId('cloud-keyless-locked').getByRole('button').first().click();
  await page.getByTestId('unlock-input').fill(passphrase);
  await page.getByTestId('unlock-submit').click();
  await page.getByTestId('unlock-input').waitFor({ state: 'detached' });
};

/**
 * Acquire this device's key on the *signed-in* surface, driving the real registrar
 * path rather than the removed signed-out `cloud-unlock` lookup. Classify the key
 * state, act on it (already keyed, unlock via the keyless banner, or complete
 * setup), and fail — never silently skip — if the device does not end up keyed.
 */
const acquireKey = async (device, passphrase) => {
  const state = await sampleUntil(
    async () => {
      const s = classifyKeyState(await presentKeyTestIds(device.page));
      return s === 'pending' ? null : s;
    },
    { label: `${device.name} key state`, timeoutMs: 45_000 },
  );

  if (isErrorKeyState(state)) {
    throw new Error(`[${device.name}] key acquisition blocked: ${state}`);
  }
  if (state === 'keyed') return 'already-keyed';
  if (state === 'unlock') await completeUnlock(device.page, passphrase);
  else await completeSetup(device.page, passphrase);

  await device.page.getByTestId('cloud-forget').waitFor({ timeout: 30_000 });
  return state === 'unlock' ? 'unlocked' : 'set-up';
};

/** Poll the device's own database until its `cloudDevices` registry row appears. */
const waitForOwnDeviceRow = (device) =>
  sampleUntil(
    () =>
      device.page.evaluate(async () => {
        const db = globalThis.db;
        const own = db.cloud?.persistedSyncState?.value?.clientIdentity;
        if (!own) return false;
        return (await db.cloudDevices.get(own)) ? own : false;
      }),
    { label: `${device.name} own cloudDevices row`, timeoutMs: 45_000 },
  );

const PROBE_SIZE = 5 * 1024 * 1024;

/**
 * Round-trip a maximum-size encrypted attachment from `source` to `target` to
 * exercise the binary (base64) codec end to end: write a 5 MiB blob with a known
 * byte pattern, push, wait for it on the target, and compare MIME, byte length,
 * and a SHA-256 of the content — then delete the probe rows on both sides.
 */
const attachmentProbe = async (source, target, size) => {
  const id = `probe-${source.name}-${size}`;
  const expected = await source.page.evaluate(async ({ probeId, probeSize }) => {
    const db = globalThis.db;
    const bytes = new Uint8Array(probeSize);
    for (let i = 0; i < probeSize; i += 1) bytes[i] = i % 256;
    await db.noteAttachments.add({
      id: probeId, noteId: probeId, spaceId: 'probe', name: 'probe.bin',
      mime: 'application/octet-stream', size: probeSize,
      blob: new Blob([bytes], { type: 'application/octet-stream' }),
      createdAt: Date.now(),
    });
    await db.cloud.sync({ purpose: 'push', wait: true });
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return { size: probeSize, mime: 'application/octet-stream', hash: [...new Uint8Array(digest)] };
  }, { probeId: id, probeSize: size });

  const got = await sampleUntil(
    () =>
      target.page.evaluate(async (probeId) => {
        const db = globalThis.db;
        await db.cloud.sync({ purpose: 'pull', wait: true });
        const row = await db.noteAttachments.get(probeId);
        if (!row?.blob) return null;
        const bytes = new Uint8Array(await row.blob.arrayBuffer());
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        return { size: bytes.length, mime: row.mime, hash: [...new Uint8Array(digest)] };
      }, id),
    { label: `${target.name} receives the probe attachment`, timeoutMs: 90_000, intervalMs: 3_000 },
  );

  const ok =
    got.size === expected.size &&
    got.mime === expected.mime &&
    got.hash.join(',') === expected.hash.join(',');

  for (const device of [source, target]) {
    await device.page.evaluate(async (probeId) => {
      const db = globalThis.db;
      await db.noteAttachments.delete(probeId);
      await db.cloud.sync({ purpose: 'push', wait: true });
    }, id);
  }
  return ok;
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

  let probeOk = true;
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
    // Destructive: require an explicit confirmation immediately before wiping.
    const confirm = arg('confirm-purge', '') || (await ask('Type PURGE to wipe the account rows: '));
    if (confirm !== 'PURGE') {
      console.error('Purge not confirmed — aborting without touching the account.');
      for (const device of devices) await device.context.close();
      process.exit(1);
    }
    const removed = await purge(devices[0].page);
    console.log('\nPurged and pushed:', removed);
  } else {
    // Acquire each device's key through the signed-in surface, failing rather
    // than skipping if it never becomes keyed — the registrar only runs once the
    // device holds a key, and skipping it hid that path.
    for (const device of devices) {
      const outcome = await acquireKey(device, passphrase);
      console.log(`  [${device.name}] key: ${outcome}`);
    }
    // Every device must have registered its own registry row before we measure.
    for (const device of devices) {
      const own = await waitForOwnDeviceRow(device);
      console.log(`  [${device.name}] registered ${own.slice(0, 10)}`);
    }
    // Bounded sampling instead of a fixed 60s sleep: sample across a window and
    // bail out the moment a device's sync rate crosses the loop ceiling; a window
    // that ends without one is a settled sync.
    console.log('\nSampling sync traffic until it settles (or a loop shows)…');
    const settleDeadline = Date.now() + 60_000;
    let loopSeen = false;
    while (Date.now() < settleDeadline && !loopSeen) {
      loopSeen = devices.some((d) => d.stats.syncPosts > SYNC_CEILING);
      if (!loopSeen) await sleep(2_000);
    }
    console.log(loopSeen ? 'Sync loop detected.' : 'Sync settled within the window.');
    for (const device of devices) {
      console.log(`\n[${device.name}]`, await readAccount(device.page));
    }

    // Maximum-size attachment round-trip across two devices exercises the binary
    // (base64) codec end to end.
    if (devices.length >= 2) {
      console.log('\nProbing a maximum-size attachment A → B…');
      probeOk = await attachmentProbe(devices[0], devices[1], PROBE_SIZE);
      console.log(`  attachment round-trip: ${probeOk ? 'ok' : 'MISMATCH'}`);
    }
  }

  const failed = report(devices) || !probeOk;
  for (const device of devices) await device.context.close();
  process.exit(failed ? 1 : 0);
};

await main();
