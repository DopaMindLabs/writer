import { describe, it, expect } from 'vitest';
import { generateMemberKeys, memberPublicOf } from './memberKeys';
import { generateContentKey } from './contentKey';
import { wrapContentKey, unwrapContentKey, type WrappedKey } from './keyWrap';
import { asBuffer } from './bytes';

const enc = new TextEncoder();
const dec = new TextDecoder();

/** Two AES-GCM keys are equal iff one can decrypt what the other encrypts. */
const sameKey = async (a: CryptoKey, b: CryptoKey): Promise<boolean> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: asBuffer(iv) }, a, asBuffer(enc.encode('probe')));
  const back = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: asBuffer(iv) }, b, ct);
  return dec.decode(back) === 'probe';
};

const roomId = 'room-1';
const epoch = 1;

const setup = async () => {
  const sender = await generateMemberKeys('owner');
  const recipient = await generateMemberKeys('writer');
  const senderPub = await memberPublicOf(sender, 'Owner');
  const recipientPub = await memberPublicOf(recipient, 'Writer');
  const contentKey = await generateContentKey();
  const wrapped = await wrapContentKey(sender, recipientPub, { roomId, epoch }, contentKey);
  return { sender, recipient, senderPub, recipientPub, contentKey, wrapped };
};

describe('keyWrap', () => {
  it('round-trips the content key for the intended recipient', async () => {
    const { recipient, senderPub, contentKey, wrapped } = await setup();
    const unwrapped = await unwrapContentKey(recipient, senderPub.agreePubRaw, wrapped);
    expect(await sameKey(contentKey, unwrapped)).toBe(true);
  });

  it('imports the unwrapped content key as non-extractable', async () => {
    const { recipient, senderPub, wrapped } = await setup();
    const unwrapped = await unwrapContentKey(recipient, senderPub.agreePubRaw, wrapped);
    expect(unwrapped.extractable).toBe(false);
  });

  it('does not let a non-recipient unwrap the key', async () => {
    const { senderPub, wrapped } = await setup();
    const intruder = await generateMemberKeys('intruder');
    await expect(unwrapContentKey(intruder, senderPub.agreePubRaw, wrapped)).rejects.toThrow();
  });

  it('binds the epoch in AAD — an old-epoch wrapped key does not open under a new epoch', async () => {
    const { recipient, senderPub, wrapped } = await setup();
    const tampered: WrappedKey = { ...wrapped, contentEpoch: wrapped.contentEpoch + 1 };
    await expect(unwrapContentKey(recipient, senderPub.agreePubRaw, tampered)).rejects.toThrow();
  });
});
