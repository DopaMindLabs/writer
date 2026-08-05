import type { AccessScopeId } from './providers.types';
import type { DeviceId, OperationId, PrincipalId } from './ids';
import type { TrustedDeviceRecord } from './trustedDevice.types';

/**
 * The port an application implements to persist trusted devices. The engine
 * never chooses a store — Writer backs this with its own table — but it does own
 * the shape, so a second host application authenticates identically.
 *
 * Every mutation is expressed as an intent (`recordSession`, `revoke`,
 * `refreshTrust`, `acknowledge`) rather than a general "save this record". A
 * general save would let a caller rewrite an identity key by passing a whole
 * object; these cannot. Reactivating a revoked record exists only as
 * `refreshTrust`, which demands proof of the same identity — no intent can
 * swap the key a pairing established.
 */
export interface TrustedDeviceRegistry {
  /** Every record for a principal, revoked ones included. */
  list: (principalId: PrincipalId) => Promise<TrustedDeviceRecord[]>;
  /** One record by device id, or `null` if this device has never paired with it. */
  find: (deviceId: DeviceId) => Promise<TrustedDeviceRecord | null>;
  /**
   * Record a newly paired device. Rejects a device id that is already known:
   * re-pairing an existing device is a session, not a new trust relationship,
   * and silently overwriting would let a peer replace the identity key a
   * previous pairing established.
   */
  trust: (record: TrustedDeviceRecord) => Promise<void>;
  /** Stamp a successful authenticated session. */
  recordSession: (options: { deviceId: DeviceId; at: number }) => Promise<void>;
  /**
   * A completed, human-confirmed pairing with a device this registry already
   * knows. When the presented key is the stored identity, the record is
   * reactivated if it was revoked and the session stamped — removal is undone
   * only by the same human checkpoint that authorised trust in the first
   * place. A presented key that differs from the stored one must reject
   * without touching the record: a known id under a new key is substitution.
   * Unknown devices are a no-op — refreshing cannot forge first trust.
   */
  refreshTrust: (options: {
    deviceId: DeviceId;
    publicIdentityJwk: JsonWebKey;
    at: number;
  }) => Promise<void>;
  /**
   * Revoke a device: it can open no new session and receives no further key
   * delivery. This cannot recall data or keys already copied to it, and is not
   * cryptographic revocation until the scope keys rotate — say so in the UI.
   */
  revoke: (options: { deviceId: DeviceId; at: number }) => Promise<void>;
  /**
   * Advance how far a peer has read one originating device within one scope.
   * `deviceId` is the acknowledging peer; `originDeviceId` is the device whose
   * operations it has read up to `operationId`.
   */
  acknowledge: (options: {
    deviceId: DeviceId;
    accessScopeId: AccessScopeId;
    originDeviceId: DeviceId;
    operationId: OperationId;
  }) => Promise<void>;
}
