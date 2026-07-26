import type { AccessScopeId } from '@/lib/syncProviders/types';

/**
 * Provider-neutral key material for sealing and opening rows: a rotation epoch,
 * a non-extractable AES-256-GCM content key, and the public one-way fingerprint
 * that names the key (`keyId`). Structurally identical to the cloud layer's
 * `CloudKeyRing`, so the existing key store satisfies it without a cast.
 */
export interface SyncKeyRing {
  epoch: number;
  contentKey: CryptoKey;
  fingerprint: Uint8Array;
}

/** Everything a resolver may use to pick key material for one row operation. */
export interface ScopeKeyContext {
  accessScopeId: AccessScopeId;
  table: string;
  primaryKey: string;
  operation: 'read' | 'write';
}

/**
 * Resolves the key material for one access scope and operation. `null` means no
 * key is available for that context — the caller falls back to its keyless
 * behaviour (pass plaintext through, hide sealed rows).
 *
 * The Stage 1 implementation returns the same account content key for every
 * scope, but the context is always passed and tested, so per-scope keys are a
 * resolver change — never another middleware API change.
 */
export interface ScopeKeyResolver {
  keyFor: (context: ScopeKeyContext) => SyncKeyRing | null;
  /**
   * Whether any key material is currently available at all. `false` lets a
   * caller take a synchronous keyless fast path (no decrypt can succeed);
   * `true` only promises that `keyFor` may resolve — not that every context
   * will. A per-scope resolver must answer `true` when it holds any key.
   */
  hasAnyKey: () => boolean;
}
