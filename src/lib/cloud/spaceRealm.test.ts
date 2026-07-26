import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import dexieCloud from 'dexie-cloud-addon';
import { buildDb } from '@/db/buildDb';
import { LoremDB } from '@/db/LoremDB';
import { NoteKind, NoteLayout, NoteState, type Doc, type Space } from '@/db/schema';
import type { DexieRow } from '@/lib/cloud/dexieRow';
import { InvariantError } from '@/lib/invariant';
import { sampleMetadata } from '@/test/fixtures';
import {
  REALM_TABLE_NAMES,
  createSpaceRealm,
  dropSpaceRealm,
  restampSpace,
} from './spaceRealm';

/**
 * These run against a plain (non-cloud) database on purpose. With no addon there
 * is no access-control middleware stamping rows behind the test, so assertions
 * see exactly what the stamping wrote; a cloud instance would also spend the
 * whole run failing to reach its sync endpoint.
 *
 * A plain database reports no current user, which is the state
 * {@link createSpaceRealm} must refuse: minting a realm then produces one whose
 * id *is* the private realm, because the addon stamps `realmId` on every written
 * row and the `realms` table is keyed on `realmId`.
 */
let db: LoremDB;

/** A space with one row in every table sharing must reach, plus a local-only one. */
const seedSpace = async (): Promise<void> => {
  await db.spaces.put({
    ...sampleMetadata(),
    id: 's1', tag: 'TST', name: 'Space', shared: false, template: 'blank',
    createdAt: 1, updatedAt: 1,
  });
  await db.sections.put({
    ...sampleMetadata(),
    id: 'sec1', spaceId: 's1', parentSectionId: null, label: 'Part', order: 1,
  });
  await db.docs.put({
    ...sampleMetadata(),
    id: 'd1', spaceId: 's1', sectionId: 'sec1', name: 'Doc', body: '',
    meta: { wordCount: 0 }, updatedAt: 1,
  });
  await db.notes.put({
    ...sampleMetadata(),
    id: 'n1', spaceId: 's1', l: 0, t: 0, w: 1, h: 1, kind: NoteKind.Note,
    state: NoteState.User, title: 'Note', body: '', layout: NoteLayout.Text,
    createdAt: 1,
  });
  await db.annotations.put({
    ...sampleMetadata(),
    id: 'ann1', docId: 'd1', rangeStart: 0, rangeEnd: 1, kind: 'highlight',
    author: 'me', createdAt: 1,
  });
  await db.revisions.put({
    ...sampleMetadata(),
    id: 'rev1', docId: 'd1', body: '', text: '', wordCount: 0,
    kind: 'manual', createdAt: 1,
  });
  await db.citations.put({
    ...sampleMetadata(),
    id: 'cit1', spaceId: 's1', key: 'k', authors: 'A', title: 'T', year: 2020,
    type: 'book', useCount: 0,
  });
  await db.palettes.put({ ...sampleMetadata(), id: 'pal1', spaceId: 's1', slots: [] });
  // Local-only: never leaves the device, so it must never carry a realm.
  await db.syncConfigs.put({ spaceId: 's1', intervalMin: 30 });
};

const SYNCED_ROWS = [
  ['spaces', 's1'],
  ['sections', 'sec1'],
  ['docs', 'd1'],
  ['notes', 'n1'],
  ['annotations', 'ann1'],
  ['revisions', 'rev1'],
  ['citations', 'cit1'],
  ['palettes', 'pal1'],
] as const;

const stampedRealms = async (): Promise<(string | undefined)[]> =>
  Promise.all(
    SYNCED_ROWS.map(async ([table, id]) => {
      const row = await db.table<{ realmId?: string }>(table).get(id);
      return row?.realmId;
    }),
  );

const restamp = async (realmId: string | undefined): Promise<void> => {
  await db.transaction(
    'rw',
    REALM_TABLE_NAMES.map((name) => db.table(name)),
    () =>
      restampSpace({
        db,
        spaceId: 's1',
        stamp: (row) => {
          if (realmId === undefined) delete row.realmId;
          else row.realmId = realmId;
        },
      }),
  );
};

beforeEach(async () => {
  db = buildDb(`realm-${String(Math.random()).slice(2)}`);
  await db.open();
  await seedSpace();
});

afterEach(async () => {
  await db.delete();
});

describe('restampSpace', () => {
  it('reaches the space and every synced descendant, including doc-scoped rows', async () => {
    await restamp('rlm-shared');

    expect(await stampedRealms()).toEqual(Array<string>(8).fill('rlm-shared'));
  });

  it('clears the realm again, returning every row to the private realm', async () => {
    await restamp('rlm-shared');

    await restamp(undefined);

    expect(await stampedRealms()).toEqual(Array<undefined>(8).fill(undefined));
  });

  it('never stamps a local-only row — those never reach the server', async () => {
    await restamp('rlm-shared');

    expect(await db.syncConfigs.get('s1')).not.toHaveProperty('realmId');
  });

  it('leaves a sibling space and its documents alone', async () => {
    await db.spaces.put({
      ...sampleMetadata('s2'),
      id: 's2', tag: 'OTH', name: 'Other', shared: false, template: 'blank',
      createdAt: 1, updatedAt: 1,
    });
    await db.docs.put({
      ...sampleMetadata('s2'),
      id: 'd2', spaceId: 's2', sectionId: 'sec2', name: 'Other doc', body: '',
      meta: { wordCount: 0 }, updatedAt: 1,
    });

    await restamp('rlm-shared');

    expect((await db.table<DexieRow<Space>>('spaces').get('s2'))?.realmId).toBeUndefined();
    expect((await db.table<DexieRow<Doc>>('docs').get('d2'))?.realmId).toBeUndefined();
  });

  it('copes with a space that has no documents', async () => {
    await db.docs.clear();
    await db.annotations.clear();
    await db.revisions.clear();

    await expect(restamp('rlm-shared')).resolves.toBeUndefined();
    expect((await db.table<DexieRow<Space>>('spaces').get('s1'))?.realmId).toBe('rlm-shared');
  });
});

describe('createSpaceRealm', () => {
  it('refuses while signed out, rather than minting a realm that grants nobody access', async () => {
    await expect(createSpaceRealm('s1', db)).rejects.toThrow(InvariantError);

    expect(await stampedRealms()).toEqual(Array<undefined>(8).fill(undefined));
  });

  it('refuses an unknown space', async () => {
    await expect(createSpaceRealm('nope', db)).rejects.toThrow(InvariantError);
  });
});

describe('dropSpaceRealm', () => {
  it("is a no-op on a space in its owner's private realm", async () => {
    await expect(dropSpaceRealm('s1', db)).resolves.toBeUndefined();

    expect(await stampedRealms()).toEqual(Array<undefined>(8).fill(undefined));
  });

  it('refuses an unknown space', async () => {
    await expect(dropSpaceRealm('nope', db)).rejects.toThrow(InvariantError);
  });
});

/**
 * The share/unshare flows need the addon's access-control tables (`realms`,
 * `members`), which a plain database lacks, so these run on a cloud-schema
 * instance. It is never `configure()`d — no endpoint, no sync — and the addon
 * reports `'unauthorized'` until a user signs in, which the sign-in-dependent
 * case fakes through the addon's public `currentUserId`.
 */
describe('share and unshare against the cloud schema', () => {
  beforeEach(async () => {
    await db.delete();
    db = new LoremDB(`realm-cloud-${String(Math.random()).slice(2)}`, {
      addons: [dexieCloud],
      cloud: true,
    });
    await db.open();
    await seedSpace();
  });

  /**
   * Sign the database in as `user-a`: the addon's default-realm middleware has
   * stamped every seeded row `'unauthorized'`, so move them into the signed-in
   * user's private realm (what syncification does on a real login) and report
   * that user from the addon's public `currentUserId`.
   */
  const signIn = async (): Promise<void> => {
    await restamp('user-a');
    vi.spyOn(db.cloud, 'currentUserId', 'get').mockReturnValue('user-a');
  };

  it('createSpaceRealm mints a realm and files every synced row into it', async () => {
    await signIn();

    const realmId = await createSpaceRealm('s1', db);

    expect(await stampedRealms()).toEqual(Array<string>(8).fill(realmId));
    expect(await db.realms.get(realmId)).toMatchObject({ name: 'Space' });
  });

  it('createSpaceRealm refuses a space that is already shared', async () => {
    await signIn();
    await createSpaceRealm('s1', db);

    await expect(createSpaceRealm('s1', db)).rejects.toThrow(InvariantError);
  });

  it('dropSpaceRealm returns the rows to the private realm and deletes the realm', async () => {
    await db.realms.put({ realmId: 'rlm-shared', name: 'Space' });
    await db.members.add({ realmId: 'rlm-shared', email: 'a@b.c' });
    await restamp('rlm-shared');

    await dropSpaceRealm('s1', db);

    // Signed out, the private realm is the addon's 'unauthorized' placeholder.
    expect(await stampedRealms()).toEqual(Array<string>(8).fill('unauthorized'));
    expect(await db.realms.get('rlm-shared')).toBeUndefined();
    expect(await db.members.where({ realmId: 'rlm-shared' }).count()).toBe(0);
  });
});
