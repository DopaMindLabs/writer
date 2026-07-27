import Dexie, { type Table } from 'dexie';

/**
 * The device-local vault database: never synced, never exported, and holding the
 * only copies of this device's secrets.
 *
 * `CryptoKey`s ride IndexedDB's structured clone, so a non-extractable key can be
 * persisted without ever existing as raw or JWK bytes. That is the whole reason
 * these rows live in their own database rather than in `LoremDB` — nothing here
 * may ever reach a sync provider.
 *
 * One declared version, no migration path: Writer has no users, so a stale local
 * database is wiped and reseeded rather than upgraded (see AGENTS.md § "Database
 * schema versions").
 */

export interface VaultRow {
  id: string;
  deviceId: string;
  principalId: string;
  wrapKey: CryptoKey;
  iv: Uint8Array;
  wrappedRoot: Uint8Array;
}

export interface IdentityRow {
  id: string;
  deviceId: string;
}

export class DeviceVaultDb extends Dexie {
  vault!: Table<VaultRow, string>;
  identity!: Table<IdentityRow, string>;
  constructor() {
    super('lipsum-device-vault');
    this.version(1).stores({ vault: 'id', identity: 'id' });
  }
}

/** There is one device, so every table holds exactly one row under this key. */
export const DEVICE_RECORD = 'device';
