import type { AccessScopeId } from './providers.types';
import type { DeviceId, OperationId, PrincipalId } from './ids';

/**
 * What a device remembers about a peer it has paired with, specified in the
 * Stage 2A runbook §19.
 *
 * This is a **security boundary**, not a convenience list: authentication checks
 * against it, so a record's absence or revocation is what refuses a session. It
 * deliberately holds no user agent, platform, IP address or other fingerprinting
 * material — none of that is needed to authenticate a key, and storing it would
 * turn a trust record into a tracking record.
 */

export enum TrustedDeviceStatus {
  /** Paired and permitted to open new sessions. */
  Active = 'active',
  /**
   * Removed by the user. The record is *kept* rather than deleted — deleting it
   * would let the same identity pair again as though it were new, and would lose
   * the fact that it was ever trusted.
   */
  Revoked = 'revoked',
}

export interface TrustedDeviceRecord {
  /** Derived from the identity key, so it cannot disagree with it. */
  deviceId: DeviceId;
  /** The peer's public identity key — what a signature is verified against. */
  publicIdentityJwk: JsonWebKey;
  /** The account both devices belong to. */
  principalId: PrincipalId;
  addedAt: number;
  /** Last successfully authenticated session, absent until one completes. */
  lastSessionAt?: number;
  /**
   * A human label for the device list. Presentation metadata only: it arrives
   * from the peer over the authenticated channel, is never part of identity, and
   * is rendered as text rather than markup.
   */
  displayName: string;
  status: TrustedDeviceStatus;
  /** When the record was revoked; absent while active. */
  revokedAt?: number;
  /**
   * The last operation this peer has acknowledged, per scope — the other half of
   * journal compaction (`SyncTombstone.acknowledgedBy`). Absent scopes mean the
   * peer has acknowledged nothing there yet.
   */
  acknowledgedOperations: Readonly<Partial<Record<AccessScopeId, OperationId>>>;
}

/**
 * Whether a record permits a new session. Revocation is checked here rather than
 * at each call site so no caller can forget: a stored record is not the same as
 * an accepted one.
 */
export const isTrustedForSession = (
  record: TrustedDeviceRecord | null,
): record is TrustedDeviceRecord =>
  record !== null && record.status === TrustedDeviceStatus.Active;
