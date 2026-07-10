import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Dexie, {
  type DBCore,
  type DBCoreTable,
  type DBCoreQueryRequest,
} from 'dexie';
import dexieCloud from 'dexie-cloud-addon';
import { STORES } from '@/db/stores';
import { generateMasterSecret, deriveKeyRing, type CloudKeyRing } from './keys';
import { CIPHER_FIELD, SYNCED_TABLES } from './tableRules';
import { createEncryptionMiddleware, type KeyProvider } from './middleware';
import { CloudKeyMismatchError, CloudKeylessWriteError } from './errors';
import { keyMismatchState } from './keyMismatch';
import { keylessLockState } from './keylessLock';

/** Everything the app persists that must never leave the device (Task 6 excludes
 *  these from sync); listed here so the spike mirrors the real cloud config. */
const LOCAL_ONLY = Object.keys(STORES).filter(
  (name) => !(SYNCED_TABLES as readonly string[]).includes(name),
);

/**
 * The encryption go/no-go spike. It stands up a real `dexie-cloud-addon`
 * database (offline: bogus URL, no login, no socket, no eager sync) with the
 * encryption middleware on top and proves the invariants that make the design
 * safe to build on — above all P2: the sync mutation queue only ever holds
 * ciphertext, so the server can never receive plaintext.
 */
/** The slice of a logged-in user the mutation tracker checks before queueing. */
interface FakeLogin {
  userId: string;
  claims: Record<string, unknown>;
  lastLogin: Date;
  isLoggedIn: true;
}
type CloudDexie = Dexie & {
  cloud: {
    configure: (o: unknown) => void;
    currentUser: { next: (u: FakeLogin) => void };
  };
};
type AnyRow = Record<string, unknown>;

/** dexie-cloud only queues mutations for a logged-in user (offline writes are
 *  seeded at login). Simulate that state so the push queue actually fills. */
const signIn = (): void =>
  db.cloud.currentUser.next({
    userId: 'spike-user',
    claims: { sub: 'spike-user' },
    lastLogin: new Date(0),
    isLoggedIn: true,
  });

let db: CloudDexie;
let ring: CloudKeyRing | null = null;
const provider: KeyProvider = { current: () => ring };

const table = (name: string) => db.table<AnyRow>(name);
/** Read a row past the middleware without decrypting, to inspect what is stored. */
const readRaw = async (name: string, key: string): Promise<AnyRow | undefined> => {
  const saved = ring;
  ring = null;
  try {
    return await table(name).get(key);
  } finally {
    ring = saved;
  }
};

beforeEach(async () => {
  // Keep the spike hermetic: a logged-in user makes the addon try to sync, so
  // fail every network call fast rather than hitting the (bogus) URL for real.
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline (spike)'));
  db = new Dexie('cloud-crypto-spike', { addons: [dexieCloud] }) as CloudDexie;
  db.version(1).stores(STORES);
  db.cloud.configure({
    databaseUrl: 'https://unset.example.invalid',
    requireAuth: false,
    disableWebSocket: true,
    disableEagerSync: true,
    unsyncedTables: LOCAL_ONLY,
  });
  db.use(createEncryptionMiddleware(provider));
  await db.open();
  ring = await deriveKeyRing(generateMasterSecret(), 1);
});

afterEach(async () => {
  ring = null;
  keyMismatchState.set(false);
  keylessLockState.set(false);
  await db.delete();
  vi.restoreAllMocks();
});

describe('cloud encryption middleware (P1–P6 spike)', () => {
  it('P1: content fields are ciphertext at rest; indexes stay plaintext', async () => {
    await table('notes').put({
      id: 'n1', spaceId: 's1', kind: 'text', createdAt: 1,
      title: 'TOPSECRET', linkedDocId: 'd1',
    });
    const raw = await readRaw('notes', 'n1');
    expect(raw?.[CIPHER_FIELD]).toBeDefined();
    expect(raw?.id).toBe('n1');
    expect(raw?.spaceId).toBe('s1');
    expect(raw?.title).toBeUndefined();
    expect(raw?.linkedDocId).toBeUndefined();
    expect(JSON.stringify(raw)).not.toContain('TOPSECRET');
  });

  it('P2 (GO/NO-GO): the sync mutation queue holds only ciphertext', async () => {
    signIn();
    await table('notes').put({
      id: 'n2', spaceId: 's1', kind: 'text', createdAt: 1,
      title: 'TOPSECRET', body: 'hidden-body',
    });
    const mutations = await table('$notes_mutations').toArray();
    expect(mutations.length).toBeGreaterThan(0);
    const serialised = JSON.stringify(mutations);
    expect(serialised).toContain(CIPHER_FIELD);
    expect(serialised).not.toContain('TOPSECRET');
    expect(serialised).not.toContain('hidden-body');
  });

  it('P3: the app reads its own writes back as plaintext', async () => {
    await table('docs').put({
      id: 'd1', spaceId: 's1', sectionId: 'sec1', updatedAt: 1,
      name: 'My Doc', body: { text: 'plain again' },
    });
    const doc = await table('docs').get('d1');
    expect(doc?.name).toBe('My Doc');
    expect(doc?.body).toEqual({ text: 'plain again' });
    expect(doc?.[CIPHER_FIELD]).toBeUndefined();
  });

  it('P4: each sealed row uses a fresh IV', async () => {
    await table('docs').put({ id: 'a', spaceId: 's', sectionId: 'x', updatedAt: 1, body: 'same' });
    await table('docs').put({ id: 'b', spaceId: 's', sectionId: 'x', updatedAt: 1, body: 'same' });
    const rawA = await readRaw('docs', 'a');
    const rawB = await readRaw('docs', 'b');
    const ivA = (rawA?.[CIPHER_FIELD] as { iv: Uint8Array }).iv;
    const ivB = (rawB?.[CIPHER_FIELD] as { iv: Uint8Array }).iv;
    expect(Array.from(ivA)).not.toEqual(Array.from(ivB));
  });

  it('P5: binary Blob field values round-trip through encryption', async () => {
    const file = new Blob([new Uint8Array([7, 8, 9])], { type: 'image/png' });
    await table('noteAttachments').put({
      id: 'att1', noteId: 'n1', spaceId: 's1', createdAt: 1, file,
    });
    const raw = await readRaw('noteAttachments', 'att1');
    expect(raw?.file).toBeUndefined();
    expect(raw?.[CIPHER_FIELD]).toBeDefined();
    const back = await table('noteAttachments').get('att1');
    const outFile = back?.file as Blob;
    expect(outFile).toBeInstanceOf(Blob);
    expect(outFile.type).toBe('image/png');
    expect(Array.from(new Uint8Array(await outFile.arrayBuffer()))).toEqual([7, 8, 9]);
  });

  it('P6: local-only tables are never encrypted, even for a logged-in user', async () => {
    signIn();
    await table('settings').put({ key: 'theme', value: 'PLAIN-SETTING' });
    const raw = await readRaw('settings', 'theme');
    expect(raw?.[CIPHER_FIELD]).toBeUndefined();
    expect(raw?.value).toBe('PLAIN-SETTING');
    // `settings` is unsynced, so nothing about it is ever pushed.
    const mutations = await table('$settings_mutations').toArray();
    expect(mutations).toHaveLength(0);
  });

  it('passes rows through untouched before a key is available', async () => {
    ring = null;
    await table('docs').put({ id: 'plain', spaceId: 's', sectionId: 'x', updatedAt: 1, body: 'B' });
    const raw = await readRaw('docs', 'plain');
    expect(raw?.[CIPHER_FIELD]).toBeUndefined();
    expect(raw?.body).toBe('B');
  });

  it('P8: refuses content mutations under a key mismatch (no plaintext reaches the queue)', async () => {
    signIn();
    keyMismatchState.set(true);
    await expect(
      table('notes').put({
        id: 'n8', spaceId: 's1', kind: 'text', createdAt: 1, title: 'TOPSECRET',
      }),
    ).rejects.toBeInstanceOf(CloudKeyMismatchError);
    // Nothing was written, so nothing is queued for the server.
    const mutations = await table('$notes_mutations').toArray();
    expect(mutations).toHaveLength(0);
    // A local-only (unsynced) table is unaffected by the content lock.
    keyMismatchState.set(false);
    await table('settings').put({ key: 'theme', value: 'ok' });
    expect((await table('settings').get('theme'))?.value).toBe('ok');
  });

  it('drops a row sealed under another key on read and flags the mismatch (never throws)', async () => {
    // Seal a row under the current ring, then swap to a *different* key — the
    // exact state a device is in after re-signing-in to an account whose rows a
    // prior key sealed. Reads must degrade, not crash the app to the recovery
    // screen (which would trap the user, unable to reach settings to resolve it).
    await table('docs').put({
      id: 'foreign', spaceId: 's', sectionId: 'x', updatedAt: 1, name: 'sealed',
    });
    ring = await deriveKeyRing(generateMasterSecret(), 1);

    // A single get returns undefined rather than throwing EnvelopeIntegrityError.
    expect(await table('docs').get('foreign')).toBeUndefined();
    // A list read omits the unreadable row instead of failing wholesale.
    expect(await table('docs').toArray()).toEqual([]);
    // The unreadable read flagged the mismatch, engaging the conflict UI + lock.
    expect(keyMismatchState.current()).toBe(true);
  });

  it('still reads rows sealed under the current key while another is unreadable', async () => {
    await table('docs').put({
      id: 'old', spaceId: 's', sectionId: 'x', updatedAt: 1, name: 'old-key',
    });
    ring = await deriveKeyRing(generateMasterSecret(), 1);
    await table('docs').put({
      id: 'new', spaceId: 's', sectionId: 'x', updatedAt: 1, name: 'new-key',
    });

    const rows = await table('docs').toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe('new-key');
  });

  it('refuses content add/put while signed-in-keyless, but lets deletes pass', async () => {
    // Seal a row while a key exists, then drop the ring and engage the keyless
    // lock (signed in, no key): new writes must not leak plaintext into the queue.
    await table('docs').put({ id: 'd1', spaceId: 's', sectionId: 'x', updatedAt: 1, name: 'seed' });
    ring = null;
    keylessLockState.set(true);

    await expect(
      table('docs').put({ id: 'd2', spaceId: 's', sectionId: 'x', updatedAt: 1, name: 'plain' }),
    ).rejects.toBeInstanceOf(CloudKeylessWriteError);
    expect(await table('$docs_mutations').toArray()).toHaveLength(0);
    // Deletes still pass (needed by the erase escape hatch).
    await expect(table('docs').delete('d1')).resolves.toBeUndefined();
  });

  it('hides sealed rows from keyless reads, but passes plaintext rows through', async () => {
    await table('docs').put({ id: 'sealed', spaceId: 's', sectionId: 'x', updatedAt: 1, name: 'secret' });
    ring = null;
    // A plaintext row written while keyless (pre-setup, lock off).
    await table('docs').put({ id: 'plain', spaceId: 's', sectionId: 'x', updatedAt: 1, name: 'clear' });

    keylessLockState.set(true);
    // The sealed row is hidden (unreadable without a key); the plaintext one shows.
    expect(await table('docs').get('sealed')).toBeUndefined();
    const rows = await table('docs').toArray();
    expect(rows.map((r) => r.id)).toEqual(['plain']);
  });

  it('leaves keyless reads untouched when the keyless lock is off (pre-setup use)', async () => {
    await table('docs').put({ id: 'sealed', spaceId: 's', sectionId: 'x', updatedAt: 1, name: 'secret' });
    ring = null;
    // Lock off: a signed-out keyless device still sees rows verbatim (raw at rest).
    const raw = await table('docs').get('sealed');
    expect(raw?.[CIPHER_FIELD]).toBeDefined();
  });

  it('decrypts a keyed bulkGet, returning plaintext for every requested row', async () => {
    await table('docs').put({ id: 'a', spaceId: 's', sectionId: 'x', updatedAt: 1, name: 'Alpha' });
    await table('docs').put({ id: 'b', spaceId: 's', sectionId: 'x', updatedAt: 1, name: 'Beta' });

    // bulkGet drives the middleware's getMany path.
    const rows = await table('docs').bulkGet(['a', 'b']);
    expect(rows.map((r) => (r as AnyRow | undefined)?.name)).toEqual(['Alpha', 'Beta']);
    expect(rows.every((r) => (r as AnyRow | undefined)?.[CIPHER_FIELD] === undefined)).toBe(true);
  });

  it('hides sealed rows from a keyless bulkGet, keeping plaintext ones', async () => {
    await table('docs').put({ id: 'sealed', spaceId: 's', sectionId: 'x', updatedAt: 1, name: 'secret' });
    ring = null;
    // A plaintext row written while keyless (pre-setup, lock off).
    await table('docs').put({ id: 'plain', spaceId: 's', sectionId: 'x', updatedAt: 1, name: 'clear' });

    keylessLockState.set(true);
    const rows = await table('docs').bulkGet(['sealed', 'plain']);
    // The sealed row becomes undefined; the plaintext one passes through.
    expect(rows[0]).toBeUndefined();
    expect((rows[1] as AnyRow | undefined)?.id).toBe('plain');
  });

  it('leaves a keyless bulkGet untouched when the keyless lock is off', async () => {
    await table('docs').put({ id: 'sealed', spaceId: 's', sectionId: 'x', updatedAt: 1, name: 'secret' });
    ring = null;
    // Lock off: the sealed row comes back raw (ciphertext at rest), not hidden.
    const rows = await table('docs').bulkGet(['sealed']);
    expect((rows[0] as AnyRow | undefined)?.[CIPHER_FIELD]).toBeDefined();
  });

  it('P7: re-putting an already-sealed row preserves its ciphertext (no double-seal)', async () => {
    await table('docs').put({
      id: 'd1', spaceId: 's1', sectionId: 'x', updatedAt: 1,
      name: 'My Doc', body: 'secret body', meta: { wordCount: 3 },
    });
    // The at-rest row keeps only its plaintext/indexed fields plus the envelope;
    // name/body/meta live *inside* $lipsumCipher, not at the top level.
    const raw = await readRaw('docs', 'd1');
    expect(raw?.name).toBeUndefined();
    expect(raw?.[CIPHER_FIELD]).toBeDefined();

    // The sync layer assigns a realm by writing the already-sealed row straight
    // back (a raw re-put). Re-sealing must not clobber the envelope with a seal
    // of the now-absent secret fields.
    await table('docs').put({ ...raw, realmId: 'rlm-user', owner: 'user@x' });

    const back = await table('docs').get('d1');
    expect(back?.name).toBe('My Doc');
    expect(back?.body).toBe('secret body');
    expect(back?.meta).toEqual({ wordCount: 3 });
  });
});

/**
 * Real IndexedDB auto-commits a transaction as soon as its last pending request
 * settles; fake-indexeddb (used above) is lenient enough not to reproduce that
 * timing, so the P1–P6 spike cannot catch a `Dexie.waitFor` call that arrives
 * one tick late. These tests instead assert the contract directly: `waitFor`
 * must wrap the native read itself, invoked synchronously, not just the decrypt
 * that follows an `await` of it.
 */
describe('createEncryptionMiddleware — transaction lifetime safety', () => {
  // Never dereferenced: every fake row below carries no cipher envelope, so
  // openRow's pass-through branch returns it untouched without touching the ring.
  const fakeRing = {} as CloudKeyRing;
  const provider: KeyProvider = { current: () => fakeRing };
  const primaryKey = { extractKey: (v: { id: string }) => v.id };

  const wrap = (overrides: Partial<DBCoreTable>): DBCoreTable => {
    const fake = { name: 'docs', schema: { primaryKey }, ...overrides } as unknown as DBCoreTable;
    const down = { table: () => fake } as unknown as DBCore;
    const created = createEncryptionMiddleware(provider).create(down) as DBCore;
    return created.table('docs');
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // The native read resolves immediately, but a correct wrapper still calls
  // Dexie.waitFor *synchronously* — before control returns to the event loop.
  // The bug awaited the native read first and called waitFor only afterwards,
  // one tick too late, so synchronously the spy would still read zero.
  it('get: wraps the native read in Dexie.waitFor synchronously', () => {
    const waitForSpy = vi.spyOn(Dexie, 'waitFor');
    const wrapped = wrap({ get: vi.fn().mockResolvedValue({ id: 'd1' }) });

    void wrapped.get({ trans: {} as never, key: 'd1' });

    expect(waitForSpy).toHaveBeenCalledTimes(1);
  });

  it('getMany: wraps the native read in Dexie.waitFor synchronously', () => {
    const waitForSpy = vi.spyOn(Dexie, 'waitFor');
    const wrapped = wrap({ getMany: vi.fn().mockResolvedValue([{ id: 'd1' }]) });

    void wrapped.getMany({ trans: {} as never, keys: ['d1'] });

    expect(waitForSpy).toHaveBeenCalledTimes(1);
  });

  it('query: wraps the native read in Dexie.waitFor synchronously', () => {
    const waitForSpy = vi.spyOn(Dexie, 'waitFor');
    const wrapped = wrap({ query: vi.fn().mockResolvedValue({ result: [{ id: 'd1' }] }) });

    void wrapped.query({
      trans: {} as never,
      values: true,
      query: {},
    } as unknown as DBCoreQueryRequest);

    expect(waitForSpy).toHaveBeenCalledTimes(1);
  });

  it('query: never calls Dexie.waitFor when the caller only wants keys', () => {
    const waitForSpy = vi.spyOn(Dexie, 'waitFor');
    const wrapped = wrap({ query: vi.fn().mockResolvedValue({ result: ['d1'] }) });

    void wrapped.query({ values: false } as unknown as DBCoreQueryRequest);

    expect(waitForSpy).not.toHaveBeenCalled();
  });
});
