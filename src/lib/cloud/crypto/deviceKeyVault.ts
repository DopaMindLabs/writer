import Dexie, { type Table } from 'dexie';
import { invariant } from '@/lib/invariant';
import { newId } from '@/lib/ids';
import { asDeviceId, type DeviceId, type PrincipalId } from 'writer-sync/core';
import type { SyncKeyRing } from 'writer-sync/crypto';
import type {
  DeviceKeyVault,
  PairingRootWrapper,
} from 'writer-sync/crypto';
import { deriveKeyRing } from './keys';
import { toBase64, fromBase64 } from 'writer-sync/crypto';

/**
 * The Writer implementation of the provider-neutral {@link DeviceKeyVault}.
 *
 * The account root is stored AES-GCM-wrapped under a non-extractable device
 * wrapping key; both live in a dedicated, never-synced database (`CryptoKey`s
 * ride IndexedDB's structured clone, so the wrapping key never exists as
 * raw/JWK bytes). The raw root appears only transiently in memory inside vault
 * operations — deriving a scope key, or re-wrapping for a pairing peer — and
 * never crosses the public API.
 *
 * Every stored record is bound to a principal and this device's minted
 * identity. The Stage 2A pairing layer replaces the minted id with a
 * cryptographic device identity; the binding contract stays the same.
 */

interface VaultRow {
  id: string;
  deviceId: string;
  principalId: string;
  wrapKey: CryptoKey;
  iv: Uint8Array;
  wrappedRoot: Uint8Array;
}

interface IdentityRow {
  id: string;
  deviceId: string;
}

class DeviceVaultDb extends Dexie {
  vault!: Table<VaultRow, string>;
  identity!: Table<IdentityRow, string>;
  constructor() {
    super('lipsum-device-vault');
    this.version(1).stores({ vault: 'id', identity: 'id' });
  }
}

const RECORD = 'device';

const asBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;

/** Non-extractable AES-256-GCM device wrapping key. */
const generateWrapKey = (): Promise<CryptoKey> =>
  crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]);

const ECDH_CURVE = 'P-256';

/** Derive the pairing transfer key from an ECDH exchange. */
const deriveSharedKey = async (
  privateKey: CryptoKey,
  peerPublicJwk: JsonWebKey,
): Promise<CryptoKey> => {
  const peerKey = await crypto.subtle.importKey(
    'jwk',
    peerPublicJwk,
    { name: 'ECDH', namedCurve: ECDH_CURVE },
    false,
    [],
  );
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: peerKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
};

const mintDeviceId = async (db: DeviceVaultDb): Promise<DeviceId> => {
  const existing = await db.identity.get(RECORD);
  if (existing) return asDeviceId(existing.deviceId);
  const minted = newId();
  await db.identity.put({ id: RECORD, deviceId: minted });
  return asDeviceId(minted);
};

/** The stored row for `principalId`, validated against both bindings. */
const boundRow = async (
  db: DeviceVaultDb,
  principalId: PrincipalId,
): Promise<VaultRow | null> => {
  const row = await db.vault.get(RECORD);
  if (!row) return null;
  const device = await mintDeviceId(db);
  invariant(
    row.deviceId === String(device),
    'device key vault: record is bound to a different device',
  );
  invariant(
    row.principalId === String(principalId),
    'device key vault: record is bound to a different principal',
  );
  return row;
};

/** Decrypt the stored root. Callers must never let the bytes escape the vault. */
const unwrapRoot = async (row: VaultRow): Promise<Uint8Array> =>
  new Uint8Array(
    await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: asBuffer(row.iv) },
      row.wrapKey,
      asBuffer(row.wrappedRoot),
    ),
  );

const wrapRootRow = async (options: {
  db: DeviceVaultDb;
  root: Uint8Array;
  principalId: PrincipalId;
}): Promise<void> => {
  const device = await mintDeviceId(options.db);
  const wrapKey = await generateWrapKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrappedRoot = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: asBuffer(iv) },
      wrapKey,
      asBuffer(options.root),
    ),
  );
  await options.db.vault.put({
    id: RECORD,
    deviceId: String(device),
    principalId: String(options.principalId),
    wrapKey,
    iv,
    wrappedRoot,
  });
};

const wrapForPairing = async (
  root: Uint8Array,
  peerEphemeralPublicJwk: JsonWebKey,
): Promise<PairingRootWrapper> => {
  const ephemeral = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: ECDH_CURVE },
    false,
    ['deriveKey'],
  );
  const shared = await deriveSharedKey(ephemeral.privateKey, peerEphemeralPublicJwk);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrapped = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: asBuffer(iv) },
      shared,
      asBuffer(root),
    ),
  );
  return {
    ephemeralPublicJwk: await crypto.subtle.exportKey('jwk', ephemeral.publicKey),
    iv: toBase64(iv),
    wrapped: toBase64(wrapped),
  };
};

const createDeviceKeyVault = (): DeviceKeyVault => {
  let database: DeviceVaultDb | null = null;
  const db = (): DeviceVaultDb => (database ??= new DeviceVaultDb());

  return {
    deviceId: () => mintDeviceId(db()),
    hasAccountRoot: async () => (await db().vault.get(RECORD)) !== undefined,
    storeAccountRoot: (root, principalId) => wrapRootRow({ db: db(), root, principalId }),
    deriveScopeKey: async ({ epoch, principalId }) => {
      // Stage 1: every scope derives the account content key; the scope id is
      // accepted so per-scope derivation changes only this implementation.
      const row = await boundRow(db(), principalId);
      if (!row) return null;
      const root = await unwrapRoot(row);
      const ring: SyncKeyRing = await deriveKeyRing(root, epoch);
      root.fill(0);
      return ring;
    },
    wrapAccountRootForPairing: async ({ peerEphemeralPublicJwk, principalId }) => {
      const row = await boundRow(db(), principalId);
      invariant(row, 'device key vault: no account root is stored');
      const root = await unwrapRoot(row);
      const wrapper = await wrapForPairing(root, peerEphemeralPublicJwk);
      root.fill(0);
      return wrapper;
    },
    forget: async () => {
      await db().vault.delete(RECORD);
    },
  };
};

/** The single vault instance for this device. */
export const deviceKeyVault: DeviceKeyVault = createDeviceKeyVault();

/**
 * Test-side counterpart of the pairing exchange: derive the shared key from the
 * peer's ephemeral private half and unwrap the root. Exported for the vault's
 * test suite (a joining device in Stage 2A performs exactly this), never used
 * by UI or provider code.
 */
export const unwrapPairingRoot = async (
  wrapper: PairingRootWrapper,
  peerPrivateKey: CryptoKey,
): Promise<Uint8Array> => {
  const shared = await deriveSharedKey(peerPrivateKey, wrapper.ephemeralPublicJwk);
  return new Uint8Array(
    await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: asBuffer(fromBase64(wrapper.iv)) },
      shared,
      asBuffer(fromBase64(wrapper.wrapped)),
    ),
  );
};
