import type { Collection, Table } from 'dexie';
import { db as appDb } from '@/db/db';
import type { LoremDB } from '@/db/LoremDB';
import { invariant } from '@/lib/invariant';

/**
 * Moving a space into its own access-control realm, and back out again.
 *
 * `spaceId` stays an application relationship; the realm is the access-control
 * boundary. The addon owns `realmId`: its access-control middleware stamps every
 * written row with the current user's id — literally `'unauthorized'` while
 * signed out, rewritten to the real id on login — so a row's *private* realm is
 * a value, not an absent field. Sharing therefore means restamping the space and
 * every row that syncs with it from that private realm onto a custom one, and
 * unsharing means restamping them back.
 *
 * The stamped set is exactly the tables that sync: a local-only row (settings,
 * backups, `docUpdates`, the collab seed markers) never reaches the server, so
 * giving it a realm would be meaningless at best and misleading at worst.
 */

/** Synced descendants reachable by the `spaceId` index. */
const SPACE_SCOPED = [
  'sections',
  'docs',
  'notes',
  'noteAttachments',
  'citations',
  'connections',
  'palettes',
] as const;

/** Synced descendants reachable only through their document. */
const DOC_SCOPED = ['annotations', 'revisions'] as const;

/** Every table a realm stamp touches — exactly the synced content tables. */
export const REALM_TABLE_NAMES = ['spaces', ...SPACE_SCOPED, ...DOC_SCOPED] as const;

const tablesFor = (db: LoremDB) => [
  ...REALM_TABLE_NAMES.map((name) => db.table(name)),
  db.realms,
  db.members,
];

/**
 * The realm a row sits in when it belongs to nobody but its owner. The addon
 * reports `'unauthorized'` until the user signs in and its rows are syncified.
 */
export const privateRealmOf = (db: LoremDB): string =>
  (db as unknown as { cloud?: { currentUserId?: string } }).cloud?.currentUserId ??
  UNAUTHORIZED;

/**
 * The addon reports this until a user signs in. Creating a realm in that state
 * mints one whose id *is* this value — the `realms` primary key is `realmId`,
 * and the access-control middleware stamps `realmId` on every written row — so
 * the "realm" would be the private realm and sharing would silently do nothing.
 */
const UNAUTHORIZED = 'unauthorized';

/** Whether a space has been moved out of its owner's private realm. */
export const isShared = (realmId: string | undefined, privateRealm: string): boolean =>
  realmId !== undefined && realmId !== privateRealm;

/**
 * Read the matching rows through the wrapped query path, stamp them in memory,
 * and write them back through the wrapped mutation path. A cursor-driven update
 * would see and store rows underneath the encryption middleware — raw
 * ciphertext on a locked device — so rows must round-trip through
 * `toArray`/`bulkPut` instead (see crypto/middleware.ts).
 */
const restampRows = async <T extends { realmId?: string }, K>(options: {
  matches: Collection<T, K>;
  table: Table<T, K>;
  stamp: (row: { realmId?: string }) => void;
}): Promise<void> => {
  const rows = await options.matches.toArray();
  if (rows.length === 0) return;
  rows.forEach(options.stamp);
  await options.table.bulkPut(rows);
};

/**
 * Apply `stamp` to the space and every synced row beneath it.
 *
 * Must be called inside a transaction covering {@link REALM_TABLE_NAMES}: a
 * half-stamped space would sync some rows into the realm and strand the rest in
 * the owner's private realm, where no member could read them. Exported so the
 * fan-out can be tested directly — it is the part that has to be right, and it
 * needs no cloud account, unlike minting the realm itself.
 */
export const restampSpace = async (options: {
  db: LoremDB;
  spaceId: string;
  stamp: (row: { realmId?: string }) => void;
}): Promise<void> => {
  const { db, spaceId, stamp } = options;
  await restampRows({ matches: db.spaces.where({ id: spaceId }), table: db.spaces, stamp });
  for (const name of SPACE_SCOPED) {
    const table = db.table<{ realmId?: string }, string>(name);
    await restampRows({ matches: table.where({ spaceId }), table, stamp });
  }
  const docIds = await db.docs.where({ spaceId }).primaryKeys();
  if (docIds.length === 0) return;
  for (const name of DOC_SCOPED) {
    const table = db.table<{ realmId?: string }, string>(name);
    await restampRows({ matches: table.where('docId').anyOf(docIds), table, stamp });
  }
};

/**
 * Give a space its own realm and file every synced row into it. Returns the new
 * realm id. The realm is named after the space so it is recognisable wherever
 * realms are listed.
 *
 * Refuses a space that already has a realm: re-sharing would mint a second realm
 * and orphan the first, taking its members' access with it.
 */
export const createSpaceRealm = async (
  spaceId: string,
  db: LoremDB = appDb,
): Promise<string> => {
  const privateRealm = privateRealmOf(db);
  // Sharing is server-side access control: without an account there is no realm
  // to grant anyone access to, and the addon would mint one indistinguishable
  // from the private realm.
  invariant(
    privateRealm !== UNAUTHORIZED,
    'Cannot share a space while signed out of the cloud',
  );
  const space = await db.spaces.get(spaceId);
  invariant(space, `Cannot share unknown space: ${spaceId}`);
  invariant(
    !isShared(space.realmId, privateRealm),
    `Space is already shared: ${spaceId} (realm ${String(space.realmId)})`,
  );

  return db.transaction('rw', tablesFor(db), async () => {
    const realmId = await db.realms.add({ name: space.name });
    await restampSpace({
      db,
      spaceId,
      stamp: (row) => {
        row.realmId = realmId;
      },
    });
    return realmId;
  });
};

/**
 * Return a space to its owner's private realm: restamp every synced row with
 * that realm, then delete the custom realm and its membership. Dropping the
 * members is the point — a realm left behind with members would keep granting
 * access to rows that have moved out of it.
 *
 * A no-op on a space that was never shared.
 */
export const dropSpaceRealm = async (
  spaceId: string,
  db: LoremDB = appDb,
): Promise<void> => {
  const space = await db.spaces.get(spaceId);
  invariant(space, `Cannot unshare unknown space: ${spaceId}`);
  const privateRealm = privateRealmOf(db);
  const { realmId } = space;
  if (realmId === undefined || !isShared(realmId, privateRealm)) return;

  await db.transaction('rw', tablesFor(db), async () => {
    await restampSpace({
      db,
      spaceId,
      stamp: (row) => {
        row.realmId = privateRealm;
      },
    });
    await db.members.where({ realmId }).delete();
    await db.realms.delete(realmId);
  });
};
