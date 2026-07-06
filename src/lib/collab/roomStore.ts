/**
 * Device persistence of a room's **shared** state: the AES-GCM content key and
 * the signed roster, keyed by `roomId`. Like the member keystore this lives in
 * its own dedicated, **unsynced** Dexie database — never the synced app db, never
 * localStorage — so the content `CryptoKey` rides IndexedDB's structured clone
 * and is never enumerable by the archive/backup layer or reachable by a sync
 * path. The roster is public (signed) but must survive reloads locally so the
 * transport can verify frames before any relay round-trip.
 *
 * This complements {@link ./crypto/keystore} (this device's private identity
 * keys): identity lives there, the room's shared material lives here.
 */
import Dexie, { type Table } from 'dexie';
import type { Roster } from './roster';

interface ContentKeyRow {
  roomId: string;
  key: CryptoKey;
}

interface RosterRow {
  roomId: string;
  roster: Roster;
}

/** An outstanding, single-use invite secret an owner minted for a room. */
export interface InviteRecord {
  secret: Uint8Array;
  role: 'writer' | 'reader';
  consumed: boolean;
}

interface InvitesRow {
  roomId: string;
  invites: InviteRecord[];
}

class RoomStoreDb extends Dexie {
  contentKeys!: Table<ContentKeyRow, string>;
  rosters!: Table<RosterRow, string>;
  invites!: Table<InvitesRow, string>;
  constructor() {
    super('lipsum-collab-roomstore');
    this.version(1).stores({ contentKeys: 'roomId', rosters: 'roomId', invites: 'roomId' });
  }
}

let store: RoomStoreDb | null = null;
const db = (): RoomStoreDb => (store ??= new RoomStoreDb());

/** Persist a room's content key for this device. */
export const saveContentKey = async (roomId: string, key: CryptoKey): Promise<void> => {
  await db().contentKeys.put({ roomId, key });
};

/** Load a room's content key, or `null` if this device holds none. */
export const loadContentKey = async (roomId: string): Promise<CryptoKey | null> => {
  const row = await db().contentKeys.get(roomId);
  return row?.key ?? null;
};

/** Persist the current signed roster for a room. */
export const saveRoster = async (roomId: string, roster: Roster): Promise<void> => {
  await db().rosters.put({ roomId, roster });
};

/** Load the current signed roster for a room, or `null` if none is stored. */
export const loadRoster = async (roomId: string): Promise<Roster | null> => {
  const row = await db().rosters.get(roomId);
  return row?.roster ?? null;
};

/** Record a freshly minted, single-use invite secret for a room. */
export const addInvite = async (
  roomId: string,
  secret: Uint8Array,
  role: 'writer' | 'reader',
): Promise<void> => {
  const row = await db().invites.get(roomId);
  const invites = [...(row?.invites ?? []), { secret, role, consumed: false }];
  await db().invites.put({ roomId, invites });
};

/** Every not-yet-consumed invite secret outstanding for a room. */
export const openInvites = async (roomId: string): Promise<InviteRecord[]> => {
  const row = await db().invites.get(roomId);
  return (row?.invites ?? []).filter((invite) => !invite.consumed);
};

/** Mark an invite secret consumed so a leaked link cannot admit twice. */
export const consumeInvite = async (roomId: string, secret: Uint8Array): Promise<void> => {
  const row = await db().invites.get(roomId);
  if (!row) return;
  const key = String(secret);
  const invites = row.invites.map((invite) =>
    String(invite.secret) === key ? { ...invite, consumed: true } : invite,
  );
  await db().invites.put({ roomId, invites });
};

/** Drop a room's shared state (leaving / stop-sharing / delete). */
export const forgetRoom = async (roomId: string): Promise<void> => {
  await db().contentKeys.delete(roomId);
  await db().rosters.delete(roomId);
  await db().invites.delete(roomId);
};
