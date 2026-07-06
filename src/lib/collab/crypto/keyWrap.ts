/**
 * Per-recipient wrapping of the room's content key. The content key is **never**
 * placed in a shared link; instead it is delivered to each admitted member sealed
 * to *their* agreement key. That is what makes per-member revocation possible —
 * rotating the key and re-wrapping to everyone except the removed member locks
 * them out of future content without disturbing anyone else (Task 10).
 *
 * The wrap derives a fresh AES-GCM key from the ECDH shared secret between sender
 * and recipient (HKDF-SHA-256), binding the room id, content epoch and recipient
 * into both the HKDF `info` and the GCM AAD. Binding the epoch is a correctness
 * property: a key wrapped under one epoch cannot be reopened once the epoch has
 * advanced, so a removed member's stale wrapped-key post is inert. The unwrapped
 * key is imported **non-extractable** — a recipient only ever encrypts and
 * decrypts content with it; only an owner (who generated the key extractable)
 * re-wraps it onward.
 */
import { deriveAgreementBits, type MemberKeys, type MemberPublic } from './memberKeys';
import { exportContentKey } from './contentKey';
import { asBuffer, utf8 } from './bytes';

/** A content key sealed to one recipient's agreement key for one epoch. */
export interface WrappedKey {
  roomId: string;
  contentEpoch: number;
  recipient: string;
  iv: Uint8Array;
  wrapped: Uint8Array;
}

/** The room and content epoch a key is wrapped for (grouped to keep arity low). */
export interface WrapTarget {
  roomId: string;
  epoch: number;
}

const HKDF_SALT = utf8('lipsum-collab-wrap-salt:1');

const wrapInfo = (roomId: string, epoch: number, recipient: string): Uint8Array =>
  utf8(`lipsum-collab-wrap:1:${roomId}:${String(epoch)}:${recipient}`);

const wrapAad = (roomId: string, epoch: number, recipient: string): Uint8Array =>
  utf8(`lipsum-collab-wrap-aad:1:${roomId}:${String(epoch)}:${recipient}`);

/** HKDF-derive the AES-GCM wrapping key from the ECDH shared secret. */
const deriveWrapKey = async (
  bits: Uint8Array,
  roomId: string,
  epoch: number,
  recipient: string,
): Promise<CryptoKey> => {
  const hkdf = await crypto.subtle.importKey('raw', asBuffer(bits), 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: asBuffer(HKDF_SALT),
      info: asBuffer(wrapInfo(roomId, epoch, recipient)),
    },
    hkdf,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
};

/** Wrap the room content key to one recipient's public agreement key. */
export const wrapContentKey = async (
  sender: MemberKeys,
  recipient: MemberPublic,
  target: WrapTarget,
  contentKey: CryptoKey,
): Promise<WrappedKey> => {
  const { roomId, epoch } = target;
  const bits = await deriveAgreementBits(sender, recipient.agreePubRaw);
  const wrapKey = await deriveWrapKey(bits, roomId, epoch, recipient.authorId);
  const raw = await exportContentKey(contentKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrapped = new Uint8Array(
    await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: asBuffer(iv),
        additionalData: asBuffer(wrapAad(roomId, epoch, recipient.authorId)),
      },
      wrapKey,
      asBuffer(raw),
    ),
  );
  return { roomId, contentEpoch: epoch, recipient: recipient.authorId, iv, wrapped };
};

/** Unwrap a content key posted to this device; imported non-extractable. */
export const unwrapContentKey = async (
  self: MemberKeys,
  senderAgreePub: Uint8Array,
  wrapped: WrappedKey,
): Promise<CryptoKey> => {
  const bits = await deriveAgreementBits(self, senderAgreePub);
  const wrapKey = await deriveWrapKey(bits, wrapped.roomId, wrapped.contentEpoch, wrapped.recipient);
  const raw = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: asBuffer(wrapped.iv),
      additionalData: asBuffer(wrapAad(wrapped.roomId, wrapped.contentEpoch, wrapped.recipient)),
    },
    wrapKey,
    asBuffer(wrapped.wrapped),
  );
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
};
