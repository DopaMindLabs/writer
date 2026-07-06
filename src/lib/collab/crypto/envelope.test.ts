import { describe, it, expect } from 'vitest';
import { generateMemberKeys, memberPublicOf } from './memberKeys';
import { generateContentKey } from './contentKey';
import {
  sealFrame,
  openFrame,
  FrameAuthError,
  FrameIntegrityError,
  type AuthorResolver,
  type Role,
} from './envelope';

const enc = new TextEncoder();
const dec = new TextDecoder();

const setup = async (role: Role = 'writer') => {
  const keys = await generateMemberKeys('author-1');
  const pub = await memberPublicOf(keys, 'Writer');
  const contentKey = await generateContentKey();
  const resolve: AuthorResolver = (id) => (id === keys.authorId ? { pub, role } : null);
  return { keys, contentKey, resolve };
};

describe('envelope', () => {
  it('seals and opens a frame round-trip', async () => {
    const { keys, contentKey, resolve } = await setup();
    const env = await sealFrame(contentKey, keys, { roomId: 'room-1', type: 'update', epoch: 1 },enc.encode('hello world'));
    expect(dec.decode(await openFrame(contentKey, resolve, env))).toBe('hello world');
  });

  it('produces a fresh iv and ciphertext for identical content', async () => {
    const { keys, contentKey } = await setup();
    const payload = enc.encode('same');
    const a = await sealFrame(contentKey, keys, { roomId: 'room-1', type: 'update', epoch: 1 },payload);
    const b = await sealFrame(contentKey, keys, { roomId: 'room-1', type: 'update', epoch: 1 },payload);
    expect([...a.iv]).not.toEqual([...b.iv]);
    expect([...a.ct]).not.toEqual([...b.ct]);
  });

  it('rejects a frame whose author is not in the roster', async () => {
    const { keys, contentKey } = await setup();
    const env = await sealFrame(contentKey, keys, { roomId: 'room-1', type: 'update', epoch: 1 },enc.encode('x'));
    await expect(openFrame(contentKey, () => null, env)).rejects.toBeInstanceOf(FrameAuthError);
  });

  it('rejects a content frame authored by a reader', async () => {
    const { keys, contentKey, resolve } = await setup('reader');
    const env = await sealFrame(contentKey, keys, { roomId: 'room-1', type: 'update', epoch: 1 },enc.encode('x'));
    await expect(openFrame(contentKey, resolve, env)).rejects.toBeInstanceOf(FrameAuthError);
  });

  it('rejects a frame with a tampered room, type or epoch (signature covers them)', async () => {
    const { keys, contentKey, resolve } = await setup();
    const env = await sealFrame(contentKey, keys, { roomId: 'room-1', type: 'update', epoch: 1 },enc.encode('x'));
    await expect(openFrame(contentKey, resolve, { ...env, roomId: 'room-2' })).rejects.toBeInstanceOf(
      FrameAuthError,
    );
    await expect(openFrame(contentKey, resolve, { ...env, contentEpoch: 2 })).rejects.toBeInstanceOf(
      FrameAuthError,
    );
    await expect(openFrame(contentKey, resolve, { ...env, type: 'snapshot' })).rejects.toBeInstanceOf(
      FrameAuthError,
    );
  });

  it('rejects a tampered ciphertext', async () => {
    const { keys, contentKey, resolve } = await setup();
    const env = await sealFrame(contentKey, keys, { roomId: 'room-1', type: 'update', epoch: 1 },enc.encode('secret'));
    const ct = Uint8Array.from(env.ct);
    ct[0] ^= 0xff;
    await expect(openFrame(contentKey, resolve, { ...env, ct })).rejects.toBeInstanceOf(FrameAuthError);
  });

  it('throws FrameIntegrityError when opened under the wrong content key', async () => {
    const { keys, contentKey, resolve } = await setup();
    const env = await sealFrame(contentKey, keys, { roomId: 'room-1', type: 'update', epoch: 1 },enc.encode('secret'));
    const wrongKey = await generateContentKey();
    await expect(openFrame(wrongKey, resolve, env)).rejects.toBeInstanceOf(FrameIntegrityError);
  });
});
