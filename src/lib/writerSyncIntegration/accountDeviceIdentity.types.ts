import type { DeviceId } from 'writer-sync/core';

/**
 * The account device identity registry row — the account-authenticated record
 * that lets two devices signed into one cloud account attribute each other's
 * operation frames without QR pairing.
 *
 * Distinct from both of its neighbours by design. `cloudDevices` is the
 * plaintext beta slot/liveness list: visible before unlock, reclaimable, and
 * never trusted for authorship. `trustedDevices` is the local-only QR/P2P
 * pairing registry and never replicates. This row is durable account
 * authorisation data: everything below the plaintext routing fields is sealed
 * in the row envelope under the account content key, which is what proves the
 * record was authorised by a holder of that key.
 *
 * No display name, email, user agent, passphrase, recovery code, root secret,
 * content key, private signing key, peer acknowledgement or provider credential
 * belongs here — the row carries exactly one public signing identity.
 */
export interface AccountDeviceIdentity {
  /**
   * Account-private Dexie Cloud key, deterministic from the cryptographic
   * {@link DeviceId} (see {@link accountDeviceIdentityId}). The `#` prefix is
   * the addon's private-singleton form, rewritten per user on the wire, so each
   * account sees only its own rows. The pseudonymous device id in the key
   * widens nothing: it already travels in every frame's plaintext routing
   * header.
   */
  id: string;
  /** Constant account-level scope required by the v2 row envelope's AAD. */
  accessScopeId: typeof ACCOUNT_IDENTITY_SCOPE;
  /** Sealed: the id derived from {@link publicIdentityJwk}, never asserted. */
  deviceId: DeviceId;
  /** Sealed: the public half of the device's signing identity. */
  publicIdentityJwk: JsonWebKey;
  /** Sealed: when a holder of the account key authorised this identity. */
  authorisedAt: number;
}

/** The access scope every account identity row is sealed for. */
export const ACCOUNT_IDENTITY_SCOPE = 'account';

const ID_PREFIX = '#writer-device:';

/** The deterministic registry primary key for a device id. */
export const accountDeviceIdentityId = (deviceId: DeviceId): string =>
  `${ID_PREFIX}${String(deviceId)}`;
