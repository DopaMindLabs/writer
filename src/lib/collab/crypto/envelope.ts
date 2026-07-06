/**
 * The wire envelope for every frame a client posts to the relay. A frame is
 * AES-256-GCM encrypted under the room's content key and signed by its author's
 * signing key, so the blind relay only ever sees ciphertext it cannot read and
 * every recipient can both attribute a frame and reject a forged or replayed one.
 *
 * Two bindings make replay and cross-context confusion impossible:
 * - the GCM **AAD** binds `roomId + type + contentEpoch`, so a ciphertext cannot
 *   be decrypted under a different room, message class or key epoch; and
 * - the **signature** covers the same fields plus the author id, the iv and the
 *   ciphertext, so none of them can be altered without invalidating the frame.
 *
 * `openFrame` verifies authority and signature *before* attempting to decrypt,
 * and surfaces the two failure modes distinctly: {@link FrameAuthError} (author
 * unknown, wrong role, or bad signature) and {@link FrameIntegrityError} (the
 * authenticated decryption failed — e.g. the wrong content epoch's key).
 */
import { signBytes, verifyBytes, type MemberKeys, type MemberPublic } from './memberKeys';

export type FrameType = 'update' | 'snapshot' | 'roster' | 'wrappedKey' | 'join' | 'awareness';
export type Role = 'owner' | 'writer' | 'reader';

export interface RelayEnvelope {
  v: 1;
  roomId: string;
  type: FrameType;
  contentEpoch: number;
  author: string;
  iv: Uint8Array;
  ct: Uint8Array;
  sig: Uint8Array;
}

/** The room / message-class / key-epoch a frame is sealed under. */
export interface FrameHeader {
  roomId: string;
  type: FrameType;
  epoch: number;
}

/** A resolved roster member: the author's public half and their room role. */
export interface FrameAuthor {
  pub: MemberPublic;
  role: Role;
}

/** Looks an author id up in the current roster; `null` if not a member. */
export type AuthorResolver = (authorId: string) => FrameAuthor | null;

export class FrameAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FrameAuthError';
  }
}

export class FrameIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FrameIntegrityError';
  }
}

/** Only content-bearing frames are gated on write authority. */
const CONTENT_TYPES: ReadonlySet<FrameType> = new Set(['update', 'snapshot']);

const utf8 = (value: string): Uint8Array => new TextEncoder().encode(value);

const asBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;

const u32 = (n: number): Uint8Array => {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, n, false);
  return out;
};

/** Unambiguous length-prefixed concatenation, so field boundaries are fixed. */
const concatLengthPrefixed = (parts: Uint8Array[]): Uint8Array => {
  const total = parts.reduce((sum, part) => sum + 4 + part.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(u32(part.byteLength), offset);
    offset += 4;
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
};

const frameAad = (roomId: string, type: FrameType, epoch: number): Uint8Array =>
  utf8(`lipsum-collab:1:${roomId}:${type}:${String(epoch)}`);

type SignableFrame = Omit<RelayEnvelope, 'v' | 'sig'>;

const frameSignedBytes = (frame: SignableFrame): Uint8Array =>
  concatLengthPrefixed([
    utf8('lipsum-collab-sig:1'),
    utf8(frame.roomId),
    utf8(frame.type),
    utf8(String(frame.contentEpoch)),
    utf8(frame.author),
    frame.iv,
    frame.ct,
  ]);

/** Encrypt and sign a frame for the relay. */
export const sealFrame = async (
  contentKey: CryptoKey,
  keys: MemberKeys,
  header: FrameHeader,
  payload: Uint8Array,
): Promise<RelayEnvelope> => {
  const { roomId, type, epoch } = header;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: asBuffer(iv), additionalData: asBuffer(frameAad(roomId, type, epoch)) },
      contentKey,
      asBuffer(payload),
    ),
  );
  const frame: SignableFrame = {
    roomId,
    type,
    contentEpoch: epoch,
    author: keys.authorId,
    iv,
    ct,
  };
  const sig = new Uint8Array(await signBytes(keys, frameSignedBytes(frame)));
  return { v: 1, ...frame, sig };
};

const authoriseFrame = (author: FrameAuthor, type: FrameType): void => {
  if (CONTENT_TYPES.has(type) && author.role === 'reader') {
    throw new FrameAuthError('a reader may not author content');
  }
};

const verifyFrameSignature = async (
  author: FrameAuthor,
  env: RelayEnvelope,
): Promise<void> => {
  const signed = frameSignedBytes(env);
  if (!(await verifyBytes(author.pub, env.sig, signed))) {
    throw new FrameAuthError('frame signature does not verify');
  }
};

const decryptFrame = async (contentKey: CryptoKey, env: RelayEnvelope): Promise<Uint8Array> => {
  try {
    const plain = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: asBuffer(env.iv),
        additionalData: asBuffer(frameAad(env.roomId, env.type, env.contentEpoch)),
      },
      contentKey,
      asBuffer(env.ct),
    );
    return new Uint8Array(plain);
  } catch {
    throw new FrameIntegrityError('frame failed authenticated decryption');
  }
};

/** Verify authority + signature, then authenticated-decrypt a frame. */
export const openFrame = async (
  contentKey: CryptoKey,
  resolve: AuthorResolver,
  env: RelayEnvelope,
): Promise<Uint8Array> => {
  const author = resolve(env.author);
  if (!author) throw new FrameAuthError('frame author is not a room member');
  authoriseFrame(author, env.type);
  await verifyFrameSignature(author, env);
  return decryptFrame(contentKey, env);
};
