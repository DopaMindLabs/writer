import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Dexie from 'dexie';
import dexieCloud from 'dexie-cloud-addon';
import { STORES } from '@/db/stores';
import { generateMasterSecret, deriveKeyRing, type CloudKeyRing } from './keys';
import { CIPHER_FIELD, SYNCED_TABLES } from './tableRules';
import { createEncryptionMiddleware, type KeyProvider } from './middleware';

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
});
