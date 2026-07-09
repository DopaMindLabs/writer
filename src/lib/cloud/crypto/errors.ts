import { EnvelopeIntegrityError } from './envelope';

/**
 * Raised when the key this device holds cannot be the account's key: the escrow
 * pulled from the server has a different {@link CloudKeyRing.fingerprint} than the
 * device ring. Reconciliation raises it proactively (before any row is decrypted),
 * and the write middleware raises it to block content mutations while the mismatch
 * is unresolved — so plaintext can never reach the sync queue under a wrong key.
 */
export class CloudKeyMismatchError extends Error {
  constructor() {
    super('The account is protected by a different key than this device holds');
    this.name = 'CloudKeyMismatchError';
  }
}

/**
 * Raised when an unlock is attempted before any escrow exists on this database —
 * e.g. a fresh device that has not yet signed in and pulled the account's `v1`
 * escrow row. It is a flow condition (the key simply has not arrived), not a
 * data-integrity failure, so it is deliberately **not** a {@link isCloudKeyError}
 * and never routes to the recovery screen.
 */
export class EscrowMissingError extends Error {
  constructor() {
    super('No cloud escrow is present on this device to unlock');
    this.name = 'EscrowMissingError';
  }
}

/**
 * Whether an unknown thrown value is a cloud-encryption key failure the recovery
 * UI knows how to handle — a ciphertext that failed authentication, or a detected
 * key mismatch. Anything else is an ordinary error and gets the generic screen.
 */
export const isCloudKeyError = (error: unknown): boolean =>
  error instanceof EnvelopeIntegrityError ||
  error instanceof CloudKeyMismatchError;
