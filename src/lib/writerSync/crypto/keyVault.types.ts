import type { AccessScopeId } from '@/lib/syncProviders/types';
import type { DeviceId, PrincipalId } from '@/lib/syncProviders/ids';
import type { SyncKeyRing } from './keyResolver';

/**
 * The account root wrapped for delivery to a pairing peer. Produced by an
 * unlocked {@link DeviceKeyVault} without ever exposing the raw root through a
 * public API: the vault derives a shared AES-GCM key from an ephemeral ECDH
 * exchange with the peer and returns only ciphertext plus the public half of
 * its own ephemeral key. The peer derives the same shared key from its private
 * half and unwraps. Nothing here is specific to QR — any pairing method that
 * can exchange two public keys can carry it.
 */
export interface PairingRootWrapper {
  /** This vault's ephemeral ECDH public key (JWK), consumed once by the peer. */
  ephemeralPublicJwk: JsonWebKey;
  /** AES-GCM iv, base64. */
  iv: string;
  /** The account root, AES-GCM-wrapped under the ECDH-derived shared key; base64. */
  wrapped: string;
}

/** The identities a vault record is bound to. */
export interface VaultBinding {
  principalId: PrincipalId;
  deviceId: DeviceId;
}

/**
 * A device-local vault for the account root. The root at rest is AES-GCM-
 * wrapped under a non-extractable device wrapping key (stored by structured
 * clone in a dedicated, never-synced database); the raw root exists only
 * transiently in memory inside vault operations and never crosses the public
 * API. Every record is bound to a principal and a device — material stored for
 * one identity never acts for another.
 */
export interface DeviceKeyVault {
  /** This device's stable vault identity, minted on first use. */
  deviceId: () => Promise<DeviceId>;
  /** Whether an account root is stored for this device. */
  hasAccountRoot: () => Promise<boolean>;
  /** Store (or replace) the account root, bound to the given principal. */
  storeAccountRoot: (root: Uint8Array, principalId: PrincipalId) => Promise<void>;
  /**
   * Key material for one access scope and epoch, derived from the stored root.
   * Stage 1 derives the account content key for every scope; per-scope
   * derivation is a change here, not in any caller. `null` when no root is
   * stored or the binding does not match.
   */
  deriveScopeKey: (options: {
    accessScopeId: AccessScopeId;
    epoch: number;
    principalId: PrincipalId;
  }) => Promise<SyncKeyRing | null>;
  /**
   * Wrap the stored root for a pairing peer identified by its ephemeral ECDH
   * public key. Requires the caller to prove the binding it acts for.
   */
  wrapAccountRootForPairing: (options: {
    peerEphemeralPublicJwk: JsonWebKey;
    principalId: PrincipalId;
  }) => Promise<PairingRootWrapper>;
  /** Erase the stored root and wrapping key (device reset / sign-out wipe). */
  forget: () => Promise<void>;
}
