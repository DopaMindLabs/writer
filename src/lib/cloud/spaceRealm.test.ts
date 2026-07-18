import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildDb } from '@/db/buildDb';
import type { LoremDB } from '@/db/LoremDB';
import { NoteKind, NoteLayout, NoteState } from '@/db/schema';
import { InvariantError } from '@/lib/invariant';
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
    id: 's1', tag: 'TST', name: 'Space', shared: false, template: 'blank',
    createdAt: 1, updatedAt: 1,
  });
  await db.sections.put({
    id: 'sec1', spaceId: 's1', parentSectionId: null, label: 'Part', order: 1,
  });
  await db.docs.put({
    id: 'd1', spaceId: 's1', sectionId: 'sec1', name: 'Doc', body: '',
    meta: { wordCount: 0 }, updatedAt: 1,
  });
  await db.notes.put({
    id: 'n1', spaceId: 's1', l: 0, t: 0, w: 1, h: 1, kind: NoteKind.Note,
    state: NoteState.User, title: 'Note', body: '', layout: NoteLayout.Text,
    createdAt: 1,
  });
  await db.annotations.put({
    id: 'ann1', docId: 'd1', rangeStart: 0, rangeEnd: 1, kind: 'highlight',
    author: 'me', createdAt: 1,
  });
  await db.revisions.put({
    id: 'rev1', docId: 'd1', body: '', text: '', wordCount: 0,
    kind: 'manual', createdAt: 1,
  });
  await db.citations.put({
    id: 'cit1', spaceId: 's1', key: 'k', authors: 'A', title: 'T', year: 2020,
    type: 'book', useCount: 0,
  });
  await db.palettes.put({ id: 'pal1', spaceId: 's1', slots: [] });
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
      id: 's2', tag: 'OTH', name: 'Other', shared: false, template: 'blank',
      createdAt: 1, updatedAt: 1,
    });
    await db.docs.put({
      id: 'd2', spaceId: 's2', sectionId: 'sec2', name: 'Other doc', body: '',
      meta: { wordCount: 0 }, updatedAt: 1,
    });

    await restamp('rlm-shared');

    expect((await db.spaces.get('s2'))?.realmId).toBeUndefined();
    expect((await db.docs.get('d2'))?.realmId).toBeUndefined();
  });

  it('copes with a space that has no documents', async () => {
    await db.docs.clear();
    await db.annotations.clear();
    await db.revisions.clear();

    await expect(restamp('rlm-shared')).resolves.toBeUndefined();
    expect((await db.spaces.get('s1'))?.realmId).toBe('rlm-shared');
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
