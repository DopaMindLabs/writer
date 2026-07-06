/**
 * The room's shared AES-256-GCM content key — the key every doc update, snapshot
 * and roster is encrypted under. Unlike the per-device cloud key it is created
 * **extractable**: every reader must hold it, so it is distributed by wrapping it
 * to each member's agreement key (Task 4), which requires exporting the raw key.
 * Confidentiality rests on that wrapping — and on the per-member signatures that
 * authorise writes — not on the key being non-extractable in memory, since every
 * member holds it by design.
 */
import { asBuffer } from './bytes';

export const CONTENT_KEY_BITS = 256;

/** Generate a fresh room content key (a new key marks a new `contentEpoch`). */
export const generateContentKey = (): Promise<CryptoKey> =>
  crypto.subtle.generateKey({ name: 'AES-GCM', length: CONTENT_KEY_BITS }, true, [
    'encrypt',
    'decrypt',
  ]);

/** Export the raw key bytes — used only to wrap the key to a member (Task 4). */
export const exportContentKey = async (key: CryptoKey): Promise<Uint8Array> =>
  new Uint8Array(await crypto.subtle.exportKey('raw', key));

/** Import raw key bytes unwrapped from an escrow post back into a usable key. */
export const importContentKey = (raw: Uint8Array): Promise<CryptoKey> =>
  crypto.subtle.importKey('raw', asBuffer(raw), { name: 'AES-GCM' }, true, [
    'encrypt',
    'decrypt',
  ]);
