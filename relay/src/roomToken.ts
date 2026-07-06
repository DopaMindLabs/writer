/**
 * A best-effort room write token — an HKDF of a shared room secret. This is
 * **anti-spam only**: real authorisation is client-side signature verification
 * against the roster (the relay cannot read content and must not be trusted to
 * gate writes). When a relay is started with a room secret, clients present the
 * matching token to post; a LAN/self-hosted relay typically runs without one.
 */
import { hkdfSync } from 'node:crypto';

export const deriveRoomWriteToken = (roomSecret: string, roomId: string): string => {
  const derived = hkdfSync(
    'sha256',
    Buffer.from(roomSecret, 'utf8'),
    Buffer.alloc(0),
    Buffer.from(`lipsum-relay-write:1:${roomId}`, 'utf8'),
    32,
  );
  return Buffer.from(derived).toString('base64url');
};
