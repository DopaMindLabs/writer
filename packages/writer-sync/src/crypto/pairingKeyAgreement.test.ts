import { describe, expect, it } from 'vitest';
import {
  MalformedEphemeralKeyError,
  derivePairingKey,
  ephemeralPublicJwkOf,
  generatePairingEphemeral,
} from './pairingKeyAgreement';

const transcriptOf = (seed: number): Uint8Array => new Uint8Array(32).fill(seed);

const roundTrip = async (sealWith: CryptoKey, openWith: CryptoKey): Promise<boolean> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const message = new TextEncoder().encode('account root');
  const sealed = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sealWith,
    message.buffer.slice(0, message.byteLength) as ArrayBuffer,
  );
  try {
    const opened = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, openWith, sealed);
    return new TextDecoder().decode(opened) === 'account root';
  } catch {
    return false;
  }
};

describe('generatePairingEphemeral', () => {
  it('produces a non-extractable ECDH P-256 private half', async () => {
    const pair = await generatePairingEphemeral();
    expect(pair.privateKey.algorithm).toMatchObject({ name: 'ECDH', namedCurve: 'P-256' });
    expect(pair.privateKey.extractable).toBe(false);
  });

  it('produces a fresh pair every session', async () => {
    const [a, b] = await Promise.all([generatePairingEphemeral(), generatePairingEphemeral()]);
    expect(await ephemeralPublicJwkOf(a.publicKey)).not.toEqual(
      await ephemeralPublicJwkOf(b.publicKey),
    );
  });

  it('never publishes the private scalar', async () => {
    const pair = await generatePairingEphemeral();
    expect(await ephemeralPublicJwkOf(pair.publicKey)).not.toHaveProperty('d');
  });
});

describe('derivePairingKey', () => {
  it('lets two devices agree the same key from one transcript', async () => {
    const [initiator, joiner] = await Promise.all([
      generatePairingEphemeral(),
      generatePairingEphemeral(),
    ]);
    const transcript = transcriptOf(1);
    const [theirs, ours] = await Promise.all([
      derivePairingKey({
        privateKey: initiator.privateKey,
        peerPublicJwk: await ephemeralPublicJwkOf(joiner.publicKey),
        transcript,
      }),
      derivePairingKey({
        privateKey: joiner.privateKey,
        peerPublicJwk: await ephemeralPublicJwkOf(initiator.publicKey),
        transcript,
      }),
    ]);
    expect(await roundTrip(theirs, ours)).toBe(true);
  });

  it('derives a different key when the transcripts disagree', async () => {
    const [initiator, joiner] = await Promise.all([
      generatePairingEphemeral(),
      generatePairingEphemeral(),
    ]);
    // The whole point of binding: a substituted payload gives the two ends
    // different transcripts, so they simply cannot talk — nobody has to notice.
    const [theirs, ours] = await Promise.all([
      derivePairingKey({
        privateKey: initiator.privateKey,
        peerPublicJwk: await ephemeralPublicJwkOf(joiner.publicKey),
        transcript: transcriptOf(1),
      }),
      derivePairingKey({
        privateKey: joiner.privateKey,
        peerPublicJwk: await ephemeralPublicJwkOf(initiator.publicKey),
        transcript: transcriptOf(2),
      }),
    ]);
    expect(await roundTrip(theirs, ours)).toBe(false);
  });

  it('derives a different key against a different peer', async () => {
    const [initiator, joiner, attacker] = await Promise.all([
      generatePairingEphemeral(),
      generatePairingEphemeral(),
      generatePairingEphemeral(),
    ]);
    const transcript = transcriptOf(1);
    const [expected, wrongPeer] = await Promise.all([
      derivePairingKey({
        privateKey: initiator.privateKey,
        peerPublicJwk: await ephemeralPublicJwkOf(joiner.publicKey),
        transcript,
      }),
      derivePairingKey({
        privateKey: attacker.privateKey,
        peerPublicJwk: await ephemeralPublicJwkOf(initiator.publicKey),
        transcript,
      }),
    ]);
    expect(await roundTrip(expected, wrongPeer)).toBe(false);
  });

  it('returns a non-extractable AES-256-GCM key', async () => {
    const [a, b] = await Promise.all([generatePairingEphemeral(), generatePairingEphemeral()]);
    const key = await derivePairingKey({
      privateKey: a.privateKey,
      peerPublicJwk: await ephemeralPublicJwkOf(b.publicKey),
      transcript: transcriptOf(1),
    });
    expect(key.algorithm).toMatchObject({ name: 'AES-GCM', length: 256 });
    expect(key.extractable).toBe(false);
    await expect(crypto.subtle.exportKey('raw', key)).rejects.toThrow();
  });

  it('rejects a peer key on the wrong curve', async () => {
    const pair = await generatePairingEphemeral();
    const peer = await ephemeralPublicJwkOf(pair.publicKey);
    await expect(
      derivePairingKey({
        privateKey: pair.privateKey,
        peerPublicJwk: { ...peer, crv: 'P-384' },
        transcript: transcriptOf(1),
      }),
    ).rejects.toBeInstanceOf(MalformedEphemeralKeyError);
  });

  it('rejects a peer key carrying a private component', async () => {
    const pair = await generatePairingEphemeral();
    const peer = await ephemeralPublicJwkOf(pair.publicKey);
    await expect(
      derivePairingKey({
        privateKey: pair.privateKey,
        peerPublicJwk: { ...peer, d: 'AQAB' },
        transcript: transcriptOf(1),
      }),
    ).rejects.toBeInstanceOf(MalformedEphemeralKeyError);
  });
});
