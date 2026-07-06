/**
 * Serialises a {@link RelayEnvelope} to and from the opaque string the relay
 * stores and forwards. The relay never parses this — it is ciphertext plus public
 * routing fields (room id, type, epoch, author) and the signature/iv, base64 for
 * transport. Only a room member with the content key and the roster can open it.
 */
import type { FrameType, RelayEnvelope } from '@/lib/collab/crypto/envelope';

const CHUNK = 0x8000;

const base64Encode = (bytes: Uint8Array): string => {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK));
  }
  return btoa(binary);
};

const base64Decode = (text: string): Uint8Array =>
  Uint8Array.from(atob(text), (char) => char.charCodeAt(0));

interface WireEnvelope {
  v: 1;
  roomId: string;
  type: FrameType;
  contentEpoch: number;
  author: string;
  iv: string;
  ct: string;
  sig: string;
}

/** Encode an envelope as the opaque relay payload string. */
export const encodeEnvelope = (env: RelayEnvelope): string =>
  JSON.stringify({
    v: 1,
    roomId: env.roomId,
    type: env.type,
    contentEpoch: env.contentEpoch,
    author: env.author,
    iv: base64Encode(env.iv),
    ct: base64Encode(env.ct),
    sig: base64Encode(env.sig),
  } satisfies WireEnvelope);

/** Decode a relay payload string back into an envelope for verification. */
export const decodeEnvelope = (payload: string): RelayEnvelope => {
  const wire = JSON.parse(payload) as WireEnvelope;
  return {
    v: 1,
    roomId: wire.roomId,
    type: wire.type,
    contentEpoch: wire.contentEpoch,
    author: wire.author,
    iv: base64Decode(wire.iv),
    ct: base64Decode(wire.ct),
    sig: base64Decode(wire.sig),
  };
};
