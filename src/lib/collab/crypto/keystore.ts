/**
 * Device persistence of a room's {@link MemberKeys}. Kept in its own dedicated
 * Dexie database — never the synced app db, never localStorage — so the
 * non-extractable `CryptoKey`s ride IndexedDB's structured clone and never exist
 * as raw or JWK bytes anywhere. Rows are keyed by `roomId`: a device holds one
 * member identity per room it participates in.
 *
 * This mirrors the cloud device keystore (`@/lib/cloud/crypto/keyStore`): private
 * key material lives outside the app database entirely, so it can never be
 * enumerated by the archive/backup layer or reached by a sync path.
 */
import Dexie, { type Table } from 'dexie';
import type { MemberKeys } from './memberKeys';

interface MemberKeysRow {
  roomId: string;
  keys: MemberKeys;
}

class CollabKeystoreDb extends Dexie {
  memberKeys!: Table<MemberKeysRow, string>;
  constructor() {
    super('lipsum-collab-keystore');
    this.version(1).stores({ memberKeys: 'roomId' });
  }
}

let keystore: CollabKeystoreDb | null = null;
const db = (): CollabKeystoreDb => (keystore ??= new CollabKeystoreDb());

/** Persist this device's member keys for a room. */
export const saveMemberKeys = async (roomId: string, keys: MemberKeys): Promise<void> => {
  await db().memberKeys.put({ roomId, keys });
};

/** Load this device's member keys for a room, or `null` if it is not a member. */
export const loadMemberKeys = async (roomId: string): Promise<MemberKeys | null> => {
  const row = await db().memberKeys.get(roomId);
  return row?.keys ?? null;
};

/** Drop this device's member keys for a room (leaving / stop-sharing / delete). */
export const forgetMemberKeys = async (roomId: string): Promise<void> => {
  await db().memberKeys.delete(roomId);
};
