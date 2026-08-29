import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import Dexie, {
  type DBCore,
  type DBCoreTable,
  type DBCoreGetRequest,
  type DBCoreQueryRequest,
  type DBCoreMutateRequest,
} from 'dexie';
import dexieCloud from 'dexie-cloud-addon';
import { CLOUD_STORES, STORES } from '@/db/stores';
import { generateRootSecret, deriveKeyRing, type CloudKeyRing } from './keys';
import { CIPHER_FIELD, ROW_ENVELOPE_TABLES } from './tableRules';
import { createEncryptionMiddleware } from './middleware';
import type { ScopeKeyResolver } from 'writer-sync/crypto';
import { CloudKeyMismatchError, CloudKeylessWriteError } from './errors';
import { keyMismatchState } from './keyMismatch';
import { keylessLockState } from './keylessLock';

/** Everything the app persists that must never leave the device (Task 6 excludes
 *  these from sync); listed here so the spike mirrors the real cloud config. */
const LOCAL_ONLY = Object.keys(STORES).filter(
  (name) => !(ROW_ENVELOPE_TABLES as readonly string[]).includes(name),
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
const provider: ScopeKeyResolver = { keyFor: () => ring, hasAnyKey: () => ring !== null };

const table = (name: string) => db.table<AnyRow>(name);

/**
 * Read a row as stored, past the encryption middleware, to inspect the ciphertext
 * at rest. Nulling the provider would now be *hidden* by the very security
 * behaviour these tests verify, so read inside a transaction flagged
 * `disableBlobResolve` — the same internal-blob bypass the middleware honours,
 * which returns the raw row untouched.
 */
const readRawBypass = (
  handle: Dexie,
  store: string,
  key: string,
): Promise<AnyRow | undefined> =>
  handle.transaction('r', handle.table(store), async () => {
    const tx = Dexie.currentTransaction as unknown as {
      idbtrans?: { disableBlobResolve?: boolean };
    };
    if (tx.idbtrans) tx.idbtrans.disableBlobResolve = true;
    return (await handle.table<AnyRow>(store).get(key)) ?? undefined;
  });

const readRaw = (name: string, key: string): Promise<AnyRow | undefined> =>
  readRawBypass(db, name, key);

beforeEach(async () => {
  // Keep the spike hermetic: a logged-in user makes the addon try to sync, so
  // fail every network call fast rather than hitting the (bogus) URL for real.
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline (spike)'));
  db = new Dexie('cloud-crypto-spike', { addons: [dexieCloud] }) as CloudDexie;
  db.version(1).stores({ ...STORES, ...CLOUD_STORES });
  db.cloud.configure({
    databaseUrl: 'https://unset.example.invalid',
    requireAuth: false,
    disableWebSocket: true,
    disableEagerSync: true,
    unsyncedTables: LOCAL_ONLY,
  });
  db.use(createEncryptionMiddleware(provider));
  await db.open();
  ring = await deriveKeyRing(generateRootSecret(), 1);
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
      id: 'n1', spaceId: 's1', kind: 'text', createdAt: 1, accessScopeId: 's1',
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
      id: 'n2', spaceId: 's1', kind: 'text', createdAt: 1, accessScopeId: 's1',
      title: 'TOPSECRET', body: 'hidden-body',
    });
    const mutations = await table('$notes_mutations').toArray();
    expect(mutations.length).toBeGreaterThan(0);
    const serialised = JSON.stringify(mutations);
    expect(serialised).toContain(CIPHER_FIELD);
    expect(serialised).not.toContain('TOPSECRET');
    expect(serialised).not.toContain('hidden-body');
  });

  it('P2b (GO/NO-GO): Table.update() never leaks a plaintext changeSpec into the sync queue', async () => {
    signIn();
    await table('docs').put({
      id: 'd-upd', spaceId: 's1', sectionId: 'x', updatedAt: 1, accessScopeId: 's1',
      name: 'Original', body: 'hidden-body',
    });
    // Dexie's Table.update() routes through Collection.modify, which attaches the
    // raw changes as `changeSpec` on the DBCore put request. The addon's change
    // tracker (below this middleware) turns that into an update operation — so an
    // unstripped changeSpec ships the plaintext field values to the server even
    // though the row's values are sealed.
    await table('docs').update('d-upd', { name: 'RENAMED-SECRET', updatedAt: 2 });

    const mutations = await table('$docs_mutations').toArray();
    expect(mutations.length).toBeGreaterThan(0);
    const serialised = JSON.stringify(mutations);
    expect(serialised).not.toContain('RENAMED-SECRET');
    expect(serialised).not.toContain('hidden-body');
    // No mutation may carry a changeSpec at all: the leak is structural, not
    // value-specific — a modify/update op replays plaintext onto server rows.
    expect(mutations.every((mut) => !('changeSpec' in mut) && !('changeSpecs' in mut))).toBe(true);
  });

  it('P2c: Table.update() keeps every sealed field intact locally', async () => {
    await table('docs').put({
      id: 'd-keep', spaceId: 's1', sectionId: 'x', updatedAt: 1, accessScopeId: 's1',
      name: 'Original', body: 'secret body', meta: { wordCount: 2, status: 'draft' },
    });
    await table('docs').update('d-keep', { name: 'Renamed', updatedAt: 2 });

    const back = await table('docs').get('d-keep');
    expect(back?.name).toBe('Renamed');
    expect(back?.body).toBe('secret body');
    expect(back?.meta).toEqual({ wordCount: 2, status: 'draft' });
    const raw = await readRaw('docs', 'd-keep');
    expect(raw?.name).toBeUndefined();
    expect(raw?.body).toBeUndefined();
  });

  it('P3: the app reads its own writes back as plaintext', async () => {
    await table('docs').put({
      id: 'd1', spaceId: 's1', sectionId: 'sec1', updatedAt: 1, accessScopeId: 's1',
      name: 'My Doc', body: { text: 'plain again' },
    });
    const doc = await table('docs').get('d1');
    expect(doc?.name).toBe('My Doc');
    expect(doc?.body).toEqual({ text: 'plain again' });
    expect(doc?.[CIPHER_FIELD]).toBeUndefined();
  });

  it('P4: each sealed row uses a fresh IV', async () => {
    await table('docs').put({ id: 'a', spaceId: 's', sectionId: 'x', updatedAt: 1, accessScopeId: 's', body: 'same' });
    await table('docs').put({ id: 'b', spaceId: 's', sectionId: 'x', updatedAt: 1, accessScopeId: 's', body: 'same' });
    const rawA = await readRaw('docs', 'a');
    const rawB = await readRaw('docs', 'b');
    const ivA = (rawA?.[CIPHER_FIELD] as { iv: Uint8Array }).iv;
    const ivB = (rawB?.[CIPHER_FIELD] as { iv: Uint8Array }).iv;
    expect(Array.from(ivA)).not.toEqual(Array.from(ivB));
  });

  it('P5: binary Blob field values round-trip through encryption', async () => {
    const file = new Blob([new Uint8Array([7, 8, 9])], { type: 'image/png' });
    await table('noteAttachments').put({
      id: 'att1', noteId: 'n1', spaceId: 's1', createdAt: 1, accessScopeId: 's1', file,
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
    await table('docs').put({ id: 'plain', spaceId: 's', sectionId: 'x', updatedAt: 1, accessScopeId: 's', body: 'B' });
    const raw = await readRaw('docs', 'plain');
    expect(raw?.[CIPHER_FIELD]).toBeUndefined();
    expect(raw?.body).toBe('B');
  });

  it('P8: refuses content mutations under a key mismatch (no plaintext reaches the queue)', async () => {
    signIn();
    keyMismatchState.set(true);
    await expect(
      table('notes').put({
        id: 'n8', spaceId: 's1', kind: 'text', createdAt: 1, accessScopeId: 's1', title: 'TOPSECRET',
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
      id: 'foreign', spaceId: 's', sectionId: 'x', updatedAt: 1, accessScopeId: 's', name: 'sealed',
    });
    ring = await deriveKeyRing(generateRootSecret(), 1);

    // A single get returns undefined rather than throwing EnvelopeIntegrityError.
    expect(await table('docs').get('foreign')).toBeUndefined();
    // A list read omits the unreadable row instead of failing wholesale.
    expect(await table('docs').toArray()).toEqual([]);
    // The unreadable read flagged the mismatch, engaging the conflict UI + lock.
    expect(keyMismatchState.current()).toBe(true);
  });

  it('still reads rows sealed under the current key while another is unreadable', async () => {
    await table('docs').put({
      id: 'old', spaceId: 's', sectionId: 'x', updatedAt: 1, accessScopeId: 's', name: 'old-key',
    });
    ring = await deriveKeyRing(generateRootSecret(), 1);
    await table('docs').put({
      id: 'new', spaceId: 's', sectionId: 'x', updatedAt: 1, accessScopeId: 's', name: 'new-key',
    });

    const rows = await table('docs').toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe('new-key');
  });

  it('refuses content add/put while signed-in-keyless, but lets deletes pass', async () => {
    // Seal a row while a key exists, then drop the ring and engage the keyless
    // lock (signed in, no key): new writes must not leak plaintext into the queue.
    await table('docs').put({ id: 'd1', spaceId: 's', sectionId: 'x', updatedAt: 1, accessScopeId: 's', name: 'seed' });
    ring = null;
    keylessLockState.set(true);

    await expect(
      table('docs').put({ id: 'd2', spaceId: 's', sectionId: 'x', updatedAt: 1, accessScopeId: 's', name: 'plain' }),
    ).rejects.toBeInstanceOf(CloudKeylessWriteError);
    expect(await table('$docs_mutations').toArray()).toHaveLength(0);
    // Deletes still pass (needed by the erase escape hatch).
    await expect(table('docs').delete('d1')).resolves.toBeUndefined();
  });

  it('hides sealed rows from keyless reads, but passes plaintext rows through', async () => {
    await table('docs').put({ id: 'sealed', spaceId: 's', sectionId: 'x', updatedAt: 1, accessScopeId: 's', name: 'secret' });
    ring = null;
    // A plaintext row written while keyless (pre-setup, lock off).
    await table('docs').put({ id: 'plain', spaceId: 's', sectionId: 'x', updatedAt: 1, accessScopeId: 's', name: 'clear' });

    keylessLockState.set(true);
    // The sealed row is hidden (unreadable without a key); the plaintext one shows.
    expect(await table('docs').get('sealed')).toBeUndefined();
    const rows = await table('docs').toArray();
    expect(rows.map((r) => r.id)).toEqual(['plain']);
  });

  it('hides sealed rows from a no-ring read even when the keyless lock is off', async () => {
    await table('docs').put({ id: 'sealed', spaceId: 's', sectionId: 'x', updatedAt: 1, accessScopeId: 's', name: 'secret' });
    ring = null;
    keylessLockState.set(false); // signed-out, key forgotten — not "keyless-locked"
    // The sealed row must not reach a typed consumer, whatever the lock state.
    expect(await table('docs').get('sealed')).toBeUndefined();
    // It is still stored as ciphertext at rest.
    expect((await readRaw('docs', 'sealed'))?.[CIPHER_FIELD]).toBeDefined();
  });

  it('omits sealed rows from a no-ring list query when the lock is off', async () => {
    await table('docs').put({ id: 'sealed', spaceId: 's', sectionId: 'x', updatedAt: 1, accessScopeId: 's', name: 'secret' });
    ring = null;
    keylessLockState.set(false);
    await table('docs').put({ id: 'plain', spaceId: 's', sectionId: 'x', updatedAt: 1, accessScopeId: 's', name: 'clear' });

    const rows = await table('docs').toArray();
    expect(rows.map((r) => r.id)).toEqual(['plain']);
  });

  it('decrypts a keyed bulkGet, returning plaintext for every requested row', async () => {
    await table('docs').put({ id: 'a', spaceId: 's', sectionId: 'x', updatedAt: 1, accessScopeId: 's', name: 'Alpha' });
    await table('docs').put({ id: 'b', spaceId: 's', sectionId: 'x', updatedAt: 1, accessScopeId: 's', name: 'Beta' });

    // bulkGet drives the middleware's getMany path.
    const rows = await table('docs').bulkGet(['a', 'b']);
    expect(rows.map((r) => (r as AnyRow | undefined)?.name)).toEqual(['Alpha', 'Beta']);
    expect(rows.every((r) => (r as AnyRow | undefined)?.[CIPHER_FIELD] === undefined)).toBe(true);
  });

  it('hides sealed rows from a keyless bulkGet, keeping plaintext ones', async () => {
    await table('docs').put({ id: 'sealed', spaceId: 's', sectionId: 'x', updatedAt: 1, accessScopeId: 's', name: 'secret' });
    ring = null;
    // A plaintext row written while keyless (pre-setup, lock off).
    await table('docs').put({ id: 'plain', spaceId: 's', sectionId: 'x', updatedAt: 1, accessScopeId: 's', name: 'clear' });

    keylessLockState.set(true);
    const rows = await table('docs').bulkGet(['sealed', 'plain']);
    // The sealed row becomes undefined; the plaintext one passes through.
    expect(rows[0]).toBeUndefined();
    expect((rows[1] as AnyRow | undefined)?.id).toBe('plain');
  });

  it('hides sealed rows from a no-ring bulkGet when the lock is off, preserving positions', async () => {
    await table('docs').put({ id: 'sealed', spaceId: 's', sectionId: 'x', updatedAt: 1, accessScopeId: 's', name: 'secret' });
    ring = null;
    keylessLockState.set(false);
    await table('docs').put({ id: 'plain', spaceId: 's', sectionId: 'x', updatedAt: 1, accessScopeId: 's', name: 'clear' });

    const rows = await table('docs').bulkGet(['sealed', 'missing', 'plain']);
    // The sealed row is hidden; positions of missing/plaintext rows are preserved.
    expect(rows[0]).toBeUndefined();
    expect(rows[1]).toBeUndefined();
    expect((rows[2] as AnyRow | undefined)?.id).toBe('plain');
  });

  it('P7: re-putting an already-sealed row preserves its ciphertext (no double-seal)', async () => {
    await table('docs').put({
      id: 'd1', spaceId: 's1', sectionId: 'x', updatedAt: 1, accessScopeId: 's1',
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

  it('P7b: preserves the envelope when a pulled row carries stray plaintext secret fields', async () => {
    await table('docs').put({
      id: 'd7b', spaceId: 's1', sectionId: 'x', updatedAt: 1, accessScopeId: 's1',
      name: 'My Doc', body: 'secret body', meta: { wordCount: 3 },
    });
    const raw = await readRaw('docs', 'd7b');

    // A server row that a legacy plaintext update op polluted: a secret-class
    // field sits at the top level, in the clear, beside the (complete) envelope.
    // Re-ingesting it must never reseal just the stray field — that would
    // replace the envelope and destroy the document's body and metadata.
    await table('docs').put({ ...raw, name: 'stray-plaintext', updatedAt: 2 });

    const back = await table('docs').get('d7b');
    expect(back?.name).toBe('My Doc');
    expect(back?.body).toBe('secret body');
    expect(back?.meta).toEqual({ wordCount: 3 });
    // The stray plaintext must not survive at rest either.
    const healed = await readRaw('docs', 'd7b');
    expect(healed?.name).toBeUndefined();
  });
});

/**
 * The write lock refuses *app* content writes while the device is keyless or
 * mismatched, but the cloud addon applies pulled server rows (already ciphertext)
 * through this same table API — inside a transaction it marks `disableChangeTracking`
 * (the flag it also reads back to skip its own change queue). Blocking those would
 * abort the initial pull and strand the account on "fetching your account…" forever.
 * A sync-applied write must therefore pass the lock; an app write must still be
 * refused.
 */
describe('createEncryptionMiddleware — sync-applied writes bypass the write lock', () => {
  const primaryKey = { extractKey: (v: { id: string }) => v.id };

  const makeWrapped = (
    ring: CloudKeyRing | null,
  ): { wrapped: DBCoreTable; mutate: ReturnType<typeof vi.fn> } => {
    const provider: ScopeKeyResolver = { keyFor: () => ring, hasAnyKey: () => ring !== null };
    const mutate = vi.fn().mockResolvedValue({
      numFailures: 0,
      failures: [],
      results: [],
      lastResult: undefined,
    });
    const fake = { name: 'docs', schema: { primaryKey }, mutate } as unknown as DBCoreTable;
    const down = { table: () => fake } as unknown as DBCore;
    const created = createEncryptionMiddleware(provider).create(down) as DBCore;
    return { wrapped: created.table('docs'), mutate };
  };

  /** A put request, optionally on a change-tracking-disabled (sync-applied) tx. */
  const putReq = (syncApplied: boolean): DBCoreMutateRequest =>
    ({
      type: 'put',
      trans: { disableChangeTracking: syncApplied } as never,
      values: [{ id: 'r1', spaceId: 's', sectionId: 'x', updatedAt: 1, accessScopeId: 's' }],
    }) as unknown as DBCoreMutateRequest;

  afterEach(() => {
    keyMismatchState.set(false);
    keylessLockState.set(false);
    vi.restoreAllMocks();
  });

  it('lets the addon apply a pulled row while signed-in-keyless (no ring)', async () => {
    keylessLockState.set(true);
    const { wrapped, mutate } = makeWrapped(null);

    await expect(wrapped.mutate(putReq(true))).resolves.toBeDefined();
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('lets the addon apply a pulled row under a key mismatch (foreign ring held)', async () => {
    keyMismatchState.set(true);
    const ring = await deriveKeyRing(generateRootSecret(), 1);
    const { wrapped, mutate } = makeWrapped(ring);

    await expect(wrapped.mutate(putReq(true))).resolves.toBeDefined();
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('still refuses an ordinary app write while keyless (change tracking on)', async () => {
    keylessLockState.set(true);
    const { wrapped, mutate } = makeWrapped(null);

    await expect(wrapped.mutate(putReq(false))).rejects.toBeInstanceOf(
      CloudKeylessWriteError,
    );
    expect(mutate).not.toHaveBeenCalled();
  });

  it('still refuses an ordinary app write under a mismatch (change tracking on)', async () => {
    keyMismatchState.set(true);
    const ring = await deriveKeyRing(generateRootSecret(), 1);
    const { wrapped, mutate } = makeWrapped(ring);

    await expect(wrapped.mutate(putReq(false))).rejects.toBeInstanceOf(
      CloudKeyMismatchError,
    );
    expect(mutate).not.toHaveBeenCalled();
  });
});

/**
 * The cloud addon downloads an offloaded blob and patches it back into the row
 * inside a transaction it marks `disableBlobResolve`. That read-modify-write is
 * pure ciphertext plumbing: the middleware must stay inert (decrypting the
 * still-unresolved row would fail and return `undefined`, corrupting the
 * write-back and looping the download). These prove the middleware passes such
 * internal reads/writes through raw, while a normal read of the same row drops it.
 */
describe('createEncryptionMiddleware — internal blob-plumbing transactions pass through raw', () => {
  const primaryKey = { extractKey: (v: { id: string }) => v.id };
  // A sealed row whose ciphertext is still an unresolved blob ref (as it lands
  // on the receiver before the addon downloads and patches the bytes).
  const rowWithBlobRef = {
    id: 'r1',
    spaceId: 's',
    $lipsumCipher: { v: 1, epoch: 1, iv: 'aXY=', data: { _bt: 'Uint8Array', ref: '2:x', size: 5015 } },
  };

  const makeWrapped = (
    ring: CloudKeyRing,
  ): { wrapped: DBCoreTable; get: ReturnType<typeof vi.fn>; mutate: ReturnType<typeof vi.fn> } => {
    const provider: ScopeKeyResolver = { keyFor: () => ring, hasAnyKey: () => ring !== null };
    const get = vi.fn().mockResolvedValue(rowWithBlobRef);
    const mutate = vi.fn().mockResolvedValue({ numFailures: 0, failures: [], results: [], lastResult: undefined });
    const fake = { name: 'docs', schema: { primaryKey }, get, mutate } as unknown as DBCoreTable;
    const down = { table: () => fake } as unknown as DBCore;
    const created = createEncryptionMiddleware(provider).create(down) as DBCore;
    return { wrapped: created.table('docs'), get, mutate };
  };

  const getReq = (blobTx: boolean): DBCoreGetRequest =>
    ({ trans: { disableBlobResolve: blobTx } as never, key: 'r1' }) as unknown as DBCoreGetRequest;

  afterEach(() => {
    keyMismatchState.set(false);
    vi.restoreAllMocks();
  });

  it('returns the raw unresolved row inside a blob-plumbing read (never decrypts or drops it)', async () => {
    const ring = await deriveKeyRing(generateRootSecret(), 1);
    const { wrapped } = makeWrapped(ring);

    const row: unknown = await wrapped.get(getReq(true));
    expect(row).toBe(rowWithBlobRef);
    // The unreadable row did NOT engage the key-mismatch lock.
    expect(keyMismatchState.current()).toBe(false);
  });

  it('drops the same unresolved row (and never crashes) on an ordinary read', async () => {
    const ring = await deriveKeyRing(generateRootSecret(), 1);
    const { wrapped } = makeWrapped(ring);

    // Outside the blob transaction the row cannot be opened; it is dropped, and
    // a malformed shape must not be mistaken for a key mismatch.
    await expect(wrapped.get(getReq(false))).resolves.toBeUndefined();
    expect(keyMismatchState.current()).toBe(false);
  });

  it('writes the raw row back inside a blob-plumbing mutate (never reseals)', async () => {
    const ring = await deriveKeyRing(generateRootSecret(), 1);
    const { wrapped, mutate } = makeWrapped(ring);

    const req = {
      type: 'put',
      trans: { disableBlobResolve: true } as never,
      values: [rowWithBlobRef],
    } as unknown as DBCoreMutateRequest;
    await wrapped.mutate(req);
    // The exact request reaches the core untouched — no reseal pass.
    expect(mutate).toHaveBeenCalledWith(req);
  });
});

/**
 * The unit tests above fake `req.trans`; this one drives a real Dexie transaction
 * through IndexedDB. It marks the transaction `disableChangeTracking` on its
 * `idbtrans` — exactly as the addon's `applyServerChanges` marks the transaction
 * it writes pulled server rows in — and proves the write lock reads that off the
 * DBCore `req.trans` and lets the write reach storage verbatim, while an ordinary
 * app write on a plain transaction is still refused. This is the end of the
 * deadlock chain: without the exemption the initial pull would abort here. It uses
 * a plain Dexie db (no cloud addon) so no background sync engine runs — the flag
 * propagation is the addon's only relevant behaviour and it is reproduced directly.
 */
describe('createEncryptionMiddleware — a real disableChangeTracking transaction lands through the lock', () => {
  const DOCS_SCHEMA = { docs: 'id, spaceId, sectionId, updatedAt, [spaceId+sectionId]' };
  let realDb: Dexie;
  const pulledRow = (id: string): AnyRow => ({
    id, spaceId: 's1', sectionId: 'x1', updatedAt: 1, [CIPHER_FIELD]: { v: 1 },
  });

  /** Read a row as stored, past the middleware (via the blob-resolve bypass). */
  const readStored = (id: string): Promise<AnyRow | undefined> =>
    readRawBypass(realDb, 'docs', id);

  /** Apply a row the way the addon does: inside a change-tracking-disabled tx. */
  const applyPulled = (id: string): Promise<unknown> =>
    realDb.transaction('rw', realDb.table('docs'), async () => {
      const tx = Dexie.currentTransaction as unknown as {
        idbtrans?: { disableChangeTracking?: boolean };
      };
      if (tx.idbtrans) tx.idbtrans.disableChangeTracking = true;
      return realDb.table('docs').bulkPut([pulledRow(id)]);
    });

  beforeEach(async () => {
    ring = null;
    realDb = new Dexie('mw-real-tx');
    realDb.version(1).stores(DOCS_SCHEMA);
    realDb.use(createEncryptionMiddleware(provider));
    await realDb.open();
  });

  afterEach(async () => {
    keyMismatchState.set(false);
    keylessLockState.set(false);
    await realDb.delete();
  });

  it('applies a sync-marked bulkPut while signed-in-keyless and stores it verbatim', async () => {
    keylessLockState.set(true);

    await expect(applyPulled('pulled-1')).resolves.toBe('pulled-1');

    // Passed through unsealed (no key held), preserving the ciphertext the addon pulled.
    const raw = await readStored('pulled-1');
    expect(raw?.id).toBe('pulled-1');
    expect(raw?.[CIPHER_FIELD]).toEqual({ v: 1 });
  });

  it('still refuses an ordinary app bulkPut on a plain transaction while keyless', async () => {
    keylessLockState.set(true);

    // A real high-level write (no disableChangeTracking) is stopped by the lock
    // before it reaches storage; Dexie surfaces the middleware rejection.
    await expect(realDb.table('docs').bulkPut([pulledRow('app-1')])).rejects.toThrow();

    expect(await readStored('app-1')).toBeUndefined();
  });
});

/**
 * The account device identity registry is a directly replicated, row-envelope
 * encrypted control table: its rows cross the untrusted provider boundary
 * without first becoming operation frames, so the middleware enforces a
 * stricter rule than for journalled domain content. Provider input may carry
 * ciphertext another account device sealed; it may never ask this device to
 * authenticate plaintext. These are security gates, not coverage assertions.
 */
describe('createEncryptionMiddleware — replicated encrypted control rows fail closed', () => {
  const IDENTITY_TABLE = 'accountDeviceIdentities';
  const JWK_X = 'jwk-x-sentinel-value';
  const JWK_Y = 'jwk-y-sentinel-value';
  const AUTHORISED_AT = 1723000000123;
  const identityRow = (): AnyRow => ({
    id: '#writer-device:dev-1',
    accessScopeId: 'account',
    deviceId: 'dev-1',
    publicIdentityJwk: { kty: 'EC', crv: 'P-256', x: JWK_X, y: JWK_Y },
    authorisedAt: AUTHORISED_AT,
  });

  /** Write a row the way the addon applies pulled server rows. */
  const applySyncPulled = (row: AnyRow): Promise<unknown> =>
    db.transaction('rw', table(IDENTITY_TABLE), async () => {
      const tx = Dexie.currentTransaction as unknown as {
        idbtrans?: { disableChangeTracking?: boolean };
      };
      if (tx.idbtrans) tx.idbtrans.disableChangeTracking = true;
      return table(IDENTITY_TABLE).put(row);
    });

  /** Plant a stored row past the middleware (the raw at-rest state). */
  const writeRawBypass = (row: AnyRow): Promise<unknown> =>
    db.transaction('rw', table(IDENTITY_TABLE), async () => {
      const tx = Dexie.currentTransaction as unknown as {
        idbtrans?: { disableBlobResolve?: boolean };
      };
      if (tx.idbtrans) tx.idbtrans.disableBlobResolve = true;
      return table(IDENTITY_TABLE).put(row);
    });

  /** A genuine sealed registry row, as it rests after a keyed app write. */
  const sealedIdentityRow = async (): Promise<AnyRow> => {
    await table(IDENTITY_TABLE).put(identityRow());
    const raw = await readRaw(IDENTITY_TABLE, '#writer-device:dev-1');
    await table(IDENTITY_TABLE).delete('#writer-device:dev-1');
    expect(raw?.[CIPHER_FIELD]).toBeDefined();
    return raw!;
  };

  it('seals a keyed app write and opens it again at the account scope', async () => {
    await table(IDENTITY_TABLE).put(identityRow());

    // At rest: only routing plaintext plus the envelope — no identity material.
    const raw = await readRaw(IDENTITY_TABLE, '#writer-device:dev-1');
    expect(raw?.id).toBe('#writer-device:dev-1');
    expect(raw?.accessScopeId).toBe('account');
    expect(raw?.deviceId).toBeUndefined();
    expect(raw?.publicIdentityJwk).toBeUndefined();
    expect(raw?.authorisedAt).toBeUndefined();
    expect(raw?.[CIPHER_FIELD]).toBeDefined();

    // The `account` scope is a first outside the space/document scopes: the AAD
    // binds it, and the row must open back under the same account key.
    const back = await table(IDENTITY_TABLE).get('#writer-device:dev-1');
    expect(back?.deviceId).toBe('dev-1');
    expect(back?.publicIdentityJwk).toEqual({ kty: 'EC', crv: 'P-256', x: JWK_X, y: JWK_Y });
    expect(back?.authorisedAt).toBe(AUTHORISED_AT);
  });

  it('queues no plaintext identity material for the server', async () => {
    signIn();
    await table(IDENTITY_TABLE).put(identityRow());

    const mutations = await table(`$${IDENTITY_TABLE}_mutations`).toArray();
    expect(mutations.length).toBeGreaterThan(0);
    const serialised = JSON.stringify(mutations);
    expect(serialised).toContain(CIPHER_FIELD);
    expect(serialised).not.toContain(JWK_X);
    expect(serialised).not.toContain(JWK_Y);
    expect(serialised).not.toContain(String(AUTHORISED_AT));
  });

  it('refuses a keyless app write outright — an unsealed identity is an unauthenticated claim', async () => {
    ring = null;

    await expect(table(IDENTITY_TABLE).put(identityRow())).rejects.toBeInstanceOf(
      CloudKeylessWriteError,
    );
    expect(await readRaw(IDENTITY_TABLE, '#writer-device:dev-1')).toBeUndefined();
    // The stricter rule is table-scoped: keyless pre-setup *content* writes are
    // untouched — a P2P-only Writer keeps working in plaintext.
    await table('docs').put({
      id: 'pre-setup', spaceId: 's', sectionId: 'x', updatedAt: 1, accessScopeId: 's', name: 'ok',
    });
    expect((await table('docs').get('pre-setup'))?.name).toBe('ok');
  });

  it('stores a sync-applied ciphertext row verbatim while keyless and opens it after unlock', async () => {
    const sealed = await sealedIdentityRow();
    const held = ring;
    ring = null;

    // Sign-in-first: the pulled ciphertext must land even with no key held…
    await applySyncPulled(sealed);
    const raw = await readRaw(IDENTITY_TABLE, '#writer-device:dev-1');
    expect(raw?.[CIPHER_FIELD]).toEqual(sealed[CIPHER_FIELD]);
    // …but it is not readable (and so never trusted) until the key arrives.
    expect(await table(IDENTITY_TABLE).get('#writer-device:dev-1')).toBeUndefined();

    ring = held;
    const back = await table(IDENTITY_TABLE).get('#writer-device:dev-1');
    expect(back?.publicIdentityJwk).toEqual({ kty: 'EC', crv: 'P-256', x: JWK_X, y: JWK_Y });
  });

  it('never seals a sync-applied plaintext identity row — it is dropped, not adopted', async () => {
    // The device is keyed: sealing the pulled plaintext would sign provider
    // input with the account key — turning an injected row into trusted data.
    await expect(applySyncPulled(identityRow())).resolves.toBeUndefined();

    expect(await readRaw(IDENTITY_TABLE, '#writer-device:dev-1')).toBeUndefined();
    expect(await table(IDENTITY_TABLE).get('#writer-device:dev-1')).toBeUndefined();
  });

  it('drops a pulled row carrying secret-class fields beside the envelope', async () => {
    const sealed = await sealedIdentityRow();
    const polluted = {
      ...sealed,
      publicIdentityJwk: { kty: 'EC', crv: 'P-256', x: 'injected-x', y: 'injected-y' },
    };

    await applySyncPulled(polluted);
    expect(await readRaw(IDENTITY_TABLE, '#writer-device:dev-1')).toBeUndefined();
  });

  it('fails closed on every read of an unsealed stored row', async () => {
    await writeRawBypass(identityRow());
    // At rest the plaintext row exists…
    expect((await readRaw(IDENTITY_TABLE, '#writer-device:dev-1'))?.deviceId).toBe('dev-1');

    // …but no read path may surface it as an identity: not keyed…
    expect(await table(IDENTITY_TABLE).get('#writer-device:dev-1')).toBeUndefined();
    expect(await table(IDENTITY_TABLE).toArray()).toEqual([]);
    expect(await table(IDENTITY_TABLE).bulkGet(['#writer-device:dev-1'])).toEqual([undefined]);

    // …and not keyless either (content tables pass plaintext through here).
    ring = null;
    expect(await table(IDENTITY_TABLE).get('#writer-device:dev-1')).toBeUndefined();
    expect(await table(IDENTITY_TABLE).toArray()).toEqual([]);
  });

  it('yields no identity from wrong-key ciphertext', async () => {
    const sealed = await sealedIdentityRow();
    await applySyncPulled(sealed);
    ring = await deriveKeyRing(generateRootSecret(), 1);

    expect(await table(IDENTITY_TABLE).get('#writer-device:dev-1')).toBeUndefined();
  });
});

/**
 * The middleware deliberately leaves `openCursor` unwrapped (see the note above
 * `wrapTable`), so cursor-driven reads — `.sortBy()`, `.each()` — and `.modify()`
 * see rows exactly as stored: a row sealed under a key this device does not hold
 * comes back RAW, with its encrypted fields missing, and crashes any consumer
 * that trusts the row type (e.g. reading `doc.meta.wordCount`). Every caller
 * must therefore read through the wrapped key/query paths (`get`/`toArray`) and
 * sort in memory. This scan enforces that contract across the app source.
 */
describe('encrypted tables are never read through unwrapped cursor paths', () => {
  const SRC_ROOT = path.resolve(__dirname, '../../../');
  const CURSOR_CALL = /\.(sortBy|each|modify)\(/;

  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      return [full];
    });

  it('no production source calls .sortBy/.each/.modify (cursors bypass this middleware)', () => {
    const offenders = walk(SRC_ROOT)
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) => !/\.(test|stories)\.(ts|tsx)$/.test(file))
      // The middleware itself names the forbidden calls in its doc comments.
      .filter((file) => !file.endsWith(`crypto${path.sep}middleware.ts`))
      .filter((file) => CURSOR_CALL.test(readFileSync(file, 'utf8')))
      .map((file) => path.relative(SRC_ROOT, file));
    expect(offenders, `cursor reads bypass the encryption middleware: ${offenders.join(', ')}`).toEqual([]);
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
  const provider: ScopeKeyResolver = { keyFor: () => fakeRing, hasAnyKey: () => fakeRing !== null };
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

describe('replicated entity metadata crosses the middleware correctly', () => {
  /** A doc row carrying the provider-neutral sync metadata. */
  const docWithMetadata = (): AnyRow => ({
    id: 'd-meta',
    spaceId: 's1',
    sectionId: 'sec1',
    name: 'Metadata doc',
    body: 'plain body',
    meta: { wordCount: 2 },
    updatedAt: 1,
    accessScopeId: 's1',
    createdBy: 'author-1',
    updatedBy: 'author-1',
    mutationId: 'op-1',
    logicalUpdatedAt: { millis: 1, counter: 0 },
  });

  it('keeps routing metadata plaintext at rest so a keyless provider can route', async () => {
    await table('docs').put(docWithMetadata());

    const raw = await readRaw('docs', 'd-meta');
    expect(raw?.accessScopeId).toBe('s1');
    expect(raw?.mutationId).toBe('op-1');
    expect(raw?.logicalUpdatedAt).toEqual({ millis: 1, counter: 0 });
  });

  it('seals attribution — createdBy and updatedBy exist only inside the envelope', async () => {
    await table('docs').put(docWithMetadata());

    const raw = await readRaw('docs', 'd-meta');
    expect(raw?.[CIPHER_FIELD]).toBeDefined();
    expect(raw?.createdBy).toBeUndefined();
    expect(raw?.updatedBy).toBeUndefined();

    // The decrypted read restores attribution alongside the content.
    const opened = await table('docs').get('d-meta');
    expect(opened?.createdBy).toBe('author-1');
    expect(opened?.updatedBy).toBe('author-1');
  });

  it('never stores an email address in the attribution fields', async () => {
    await table('docs').put(docWithMetadata());

    const opened = await table('docs').get('d-meta');
    expect(String(opened?.createdBy)).not.toContain('@');
    expect(String(opened?.updatedBy)).not.toContain('@');
  });
});

describe('the resolver receives the full scope-key context', () => {
  it('passes scope, table, primary key and operation on write and read', async () => {
    const contexts: import('writer-sync/crypto').ScopeKeyContext[] = [];
    const spying: ScopeKeyResolver = {
      keyFor: (context) => {
        contexts.push(context);
        return ring;
      },
      hasAnyKey: () => true,
    };
    const spied = new Dexie('resolver-context-spy') as CloudDexie;
    spied.version(1).stores(STORES);
    spied.use(createEncryptionMiddleware(spying, () => 'none'));
    try {
      await spied.open();
      await spied.table<AnyRow>('docs').put({
        id: 'ctx-1', spaceId: 's9', sectionId: 'x', updatedAt: 1,
        accessScopeId: 's9', name: 'ctx',
      });
      await spied.table<AnyRow>('docs').get('ctx-1');

      const write = contexts.find((c) => c.operation === 'write');
      expect(write).toEqual({
        accessScopeId: 's9',
        table: 'docs',
        primaryKey: 'ctx-1',
        operation: 'write',
      });
      const read = contexts.find((c) => c.operation === 'read');
      expect(read).toEqual({
        accessScopeId: 's9',
        table: 'docs',
        primaryKey: 'ctx-1',
        operation: 'read',
      });
    } finally {
      await spied.delete();
    }
  });
});
