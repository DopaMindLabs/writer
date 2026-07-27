import { invariant } from '@/lib/invariant';
import { newId } from '@/lib/ids';
import { asDeviceId, type DeviceId, type PrincipalId } from 'writer-sync/core';
import type { SyncKeyRing } from 'writer-sync/crypto';
import type {
  DeviceKeyVault,
  PairingRootWrapper,
} from 'writer-sync/crypto';
import { deriveKeyRing } from './keys';
import {
  DEVICE_RECORD,
  DeviceVaultDb,
  type VaultRow,
} from './deviceVaultDb';
import {
  derivePairingKey,
  ephemeralPublicJwkOf,
  fromBase64,
  generatePairingEphemeral,
  toBase64,
} from 'writer-sync/crypto';

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

/**
 * AAD for the account-bootstrap wrapper: the domain label, a separator, then the
 * pairing transcript. Binding the transcript is what stops a wrapper captured
 * from one session being replayed into another — the ciphertext simply fails to
 * open under a transcript it was not sealed for.
 */
const PAIRING_ROOT_LABEL = 'lipsum-pair-root-v1';

const wrapperAad = (transcript: Uint8Array): ArrayBuffer => {
  const label = new TextEncoder().encode(PAIRING_ROOT_LABEL);
  const aad = new Uint8Array(label.length + 1 + transcript.length);
  aad.set(label, 0);
  aad[label.length] = 0;
  aad.set(transcript, label.length + 1);
  return asBuffer(aad);
};

const mintDeviceId = async (db: DeviceVaultDb): Promise<DeviceId> => {
  const existing = await db.identity.get(DEVICE_RECORD);
  if (existing) return asDeviceId(existing.deviceId);
  const minted = newId();
  await db.identity.put({ id: DEVICE_RECORD, deviceId: minted });
  return asDeviceId(minted);
};

/** The stored row for `principalId`, validated against both bindings. */
const boundRow = async (
  db: DeviceVaultDb,
  principalId: PrincipalId,
): Promise<VaultRow | null> => {
  const row = await db.vault.get(DEVICE_RECORD);
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
    id: DEVICE_RECORD,
    deviceId: String(device),
    principalId: String(options.principalId),
    wrapKey,
    iv,
    wrappedRoot,
  });
};

const wrapForPairing = async (options: {
  root: Uint8Array;
  peerEphemeralPublicJwk: JsonWebKey;
  transcript: Uint8Array;
}): Promise<PairingRootWrapper> => {
  const ephemeral = await generatePairingEphemeral();
  const shared = await derivePairingKey({
    privateKey: ephemeral.privateKey,
    peerPublicJwk: options.peerEphemeralPublicJwk,
    transcript: options.transcript,
  });
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrapped = new Uint8Array(
    await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: asBuffer(iv),
        additionalData: wrapperAad(options.transcript),
      },
      shared,
      asBuffer(options.root),
    ),
  );
  return {
    ephemeralPublicJwk: await ephemeralPublicJwkOf(ephemeral.publicKey),
    iv: toBase64(iv),
    wrapped: toBase64(wrapped),
  };
};

const createDeviceKeyVault = (): DeviceKeyVault => {
  let database: DeviceVaultDb | null = null;
  const db = (): DeviceVaultDb => (database ??= new DeviceVaultDb());

  return {
    deviceId: () => mintDeviceId(db()),
    hasAccountRoot: async () => (await db().vault.get(DEVICE_RECORD)) !== undefined,
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
    wrapAccountRootForPairing: async ({
      peerEphemeralPublicJwk,
      principalId,
      transcript,
    }) => {
      const row = await boundRow(db(), principalId);
      invariant(row, 'device key vault: no account root is stored');
      const root = await unwrapRoot(row);
      const wrapper = await wrapForPairing({
        root,
        peerEphemeralPublicJwk,
        transcript,
      });
      root.fill(0);
      return wrapper;
    },
    forget: async () => {
      await db().vault.delete(DEVICE_RECORD);
    },
  };
};

/** The single vault instance for this device. */
export const deviceKeyVault: DeviceKeyVault = createDeviceKeyVault();

/**
 * The joining half of the pairing exchange: derive the shared key from this
 * device's ephemeral private half and open the wrapper.
 *
 * Both the derived key and the AAD are bound to the transcript, so this throws
 * for a wrapper from another session, for another peer, or for a session whose
 * offer or answer differed by a byte — without needing to distinguish which.
 */
export const unwrapPairingRoot = async (
  wrapper: PairingRootWrapper,
  peerPrivateKey: CryptoKey,
  transcript: Uint8Array,
): Promise<Uint8Array> => {
  const shared = await derivePairingKey({
    privateKey: peerPrivateKey,
    peerPublicJwk: wrapper.ephemeralPublicJwk,
    transcript,
  });
  return new Uint8Array(
    await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: asBuffer(fromBase64(wrapper.iv)),
        additionalData: wrapperAad(transcript),
      },
      shared,
      asBuffer(fromBase64(wrapper.wrapped)),
    ),
  );
};
