import { describe, expect, it } from 'vitest';
import { generateDeviceIdentity } from '../crypto/deviceIdentity';
import { PairingError, PairingErrorCode } from './pairing.types';
import type { PairingOffer } from './pairing.types';
import { createReplayCache } from './replayCache';
import { SESSION_TTL_MILLIS } from './payloadValidation';
import { createQrSignallingAdapter } from './qrSignallingAdapter';
import type { QrSignallingAdapter, SignallingPeer } from './qrSignallingAdapter';

const NOW = 1_700_000_000_000;
const OFFER_SDP = 'v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\na=candidate:offer\r\n';
const ANSWER_SDP = 'v=0\r\no=- 2 2 IN IP4 127.0.0.1\r\na=candidate:answer\r\n';

interface RecordingPeer extends SignallingPeer {
  /** Every remote description handed to the peer, in order. */
  readonly applied: readonly string[];
}

/**
 * A peer that answers with fixed descriptions and records what it was given.
 * The adapter's contract is what it builds around an SDP, never how the SDP was
 * gathered, so a scriptable stand-in is the honest test double here.
 */
const recordingPeer = (answerSdp = ANSWER_SDP): RecordingPeer => {
  const applied: string[] = [];
  return {
    applied,
    createOffer: () => Promise.resolve(OFFER_SDP),
    acceptOffer: (sdp) => {
      applied.push(sdp);
      return Promise.resolve(answerSdp);
    },
    acceptAnswer: (sdp) => {
      applied.push(sdp);
      return Promise.resolve();
    },
  };
};

const buildAdapter = async (
  peer: SignallingPeer,
  now: () => number = () => NOW,
): Promise<QrSignallingAdapter> =>
  createQrSignallingAdapter({
    identity: await generateDeviceIdentity(),
    peer,
    // The cache reads the same clock the adapter stamps with: on a divergent
    // clock every entry is evicted as expired the moment it is written, and the
    // replay defence silently does nothing.
    replayCache: createReplayCache(now),
    now,
  });

const offerOptions = (sessionId = 'session-one') => ({
  sessionId,
  expiresAt: NOW + SESSION_TTL_MILLIS,
});

/** Drive a full initiator/joiner exchange and return both ends. */
const exchange = async (): Promise<{
  initiator: QrSignallingAdapter;
  joiner: QrSignallingAdapter;
  initiatorPeer: RecordingPeer;
  joinerPeer: RecordingPeer;
}> => {
  const initiatorPeer = recordingPeer();
  const joinerPeer = recordingPeer();
  const initiator = await buildAdapter(initiatorPeer);
  const joiner = await buildAdapter(joinerPeer);

  const offer = await initiator.createOffer(offerOptions());
  const answer = await joiner.acceptOffer(offer);
  await initiator.acceptAnswer(answer);

  return { initiator, joiner, initiatorPeer, joinerPeer };
};

describe('createOffer', () => {
  it('stamps the supplied session id, expiry and kind', async () => {
    const adapter = await buildAdapter(recordingPeer());

    const offer = await adapter.createOffer(offerOptions('abc'));

    expect(offer.kind).toBe('offer');
    expect(offer.sessionId).toBe('abc');
    expect(offer.expiresAt).toBe(NOW + SESSION_TTL_MILLIS);
  });

  it('carries the complete gathered description', async () => {
    const adapter = await buildAdapter(recordingPeer());

    const offer = await adapter.createOffer(offerOptions());

    expect(offer.sdp).toBe(OFFER_SDP);
  });

  it('produces a payload the acceptance checks accept', async () => {
    const initiator = await buildAdapter(recordingPeer());
    const joiner = await buildAdapter(recordingPeer());

    const offer = await initiator.createOffer(offerOptions());

    await expect(joiner.acceptOffer(offer)).resolves.toBeDefined();
  });

  it('mints a distinct nonce per session', async () => {
    const adapter = await buildAdapter(recordingPeer());

    const first = await adapter.createOffer(offerOptions('one'));
    const second = await adapter.createOffer(offerOptions('two'));

    expect(second.nonce).not.toBe(first.nonce);
  });
});

describe('acceptOffer', () => {
  it('applies the peer description and answers with its own', async () => {
    const initiator = await buildAdapter(recordingPeer());
    const joinerPeer = recordingPeer();
    const joiner = await buildAdapter(joinerPeer);

    const answer = await joiner.acceptOffer(await initiator.createOffer(offerOptions()));

    expect(joinerPeer.applied).toEqual([OFFER_SDP]);
    expect(answer.kind).toBe('answer');
    expect(answer.sdp).toBe(ANSWER_SDP);
  });

  it('echoes the initiator session id rather than minting its own', async () => {
    const initiator = await buildAdapter(recordingPeer());
    const joiner = await buildAdapter(recordingPeer());

    const answer = await joiner.acceptOffer(await initiator.createOffer(offerOptions('shared')));

    expect(answer.sessionId).toBe('shared');
  });

  it('refuses an expired offer', async () => {
    const initiator = await buildAdapter(recordingPeer());
    const joiner = await buildAdapter(recordingPeer(), () => NOW + SESSION_TTL_MILLIS + 1);

    const offer = await initiator.createOffer(offerOptions());

    await expect(joiner.acceptOffer(offer)).rejects.toMatchObject({
      code: PairingErrorCode.Expired,
    });
  });

  it('refuses a payload whose device id its key does not derive', async () => {
    const initiator = await buildAdapter(recordingPeer());
    const joiner = await buildAdapter(recordingPeer());

    const offer = await initiator.createOffer(offerOptions());
    const forged: PairingOffer = { ...offer, deviceId: 'not-the-derived-id' };

    await expect(joiner.acceptOffer(forged)).rejects.toMatchObject({
      code: PairingErrorCode.IdentityMismatch,
    });
  });

  it('refuses a payload whose signature does not verify', async () => {
    const initiator = await buildAdapter(recordingPeer());
    const joiner = await buildAdapter(recordingPeer());

    const offer = await initiator.createOffer(offerOptions());
    const tampered: PairingOffer = { ...offer, sdp: `${offer.sdp}a=tampered\r\n` };

    await expect(joiner.acceptOffer(tampered)).rejects.toMatchObject({
      code: PairingErrorCode.BadSignature,
    });
  });

  it('refuses a nonce it has already admitted', async () => {
    const initiator = await buildAdapter(recordingPeer());
    const joiner = await buildAdapter(recordingPeer());

    const offer = await initiator.createOffer(offerOptions());
    await joiner.acceptOffer(offer);

    await expect(joiner.acceptOffer(offer)).rejects.toMatchObject({
      code: PairingErrorCode.ReplayedNonce,
    });
  });
});

describe('acceptAnswer', () => {
  it('applies the answer description to the peer', async () => {
    const { initiatorPeer } = await exchange();

    expect(initiatorPeer.applied).toEqual([ANSWER_SDP]);
  });

  it('refuses an answer bound to a different offer', async () => {
    const initiator = await buildAdapter(recordingPeer());
    const other = await buildAdapter(recordingPeer());
    const joiner = await buildAdapter(recordingPeer());

    await initiator.createOffer(offerOptions('shared'));
    const decoyOffer = await other.createOffer(offerOptions('shared'));
    const answer = await joiner.acceptOffer(decoyOffer);

    await expect(initiator.acceptAnswer(answer)).rejects.toMatchObject({
      code: PairingErrorCode.TranscriptMismatch,
    });
  });

  it('refuses an answer for another session', async () => {
    const initiator = await buildAdapter(recordingPeer());
    const other = await buildAdapter(recordingPeer());
    const joiner = await buildAdapter(recordingPeer());

    await initiator.createOffer(offerOptions('mine'));
    const answer = await joiner.acceptOffer(await other.createOffer(offerOptions('theirs')));

    await expect(initiator.acceptAnswer(answer)).rejects.toMatchObject({
      code: PairingErrorCode.SessionMismatch,
    });
  });

  it('refuses to answer before an offer was created', async () => {
    const initiator = await buildAdapter(recordingPeer());
    const other = await buildAdapter(recordingPeer());
    const joiner = await buildAdapter(recordingPeer());

    const answer = await joiner.acceptOffer(await other.createOffer(offerOptions()));

    await expect(initiator.acceptAnswer(answer)).rejects.toBeInstanceOf(PairingError);
  });
});

describe('authenticated parameters', () => {
  it('derives the same transcript at both ends', async () => {
    const { initiator, joiner } = await exchange();

    const here = initiator.parameters();
    const there = joiner.parameters();

    expect(here).not.toBeNull();
    expect(there).not.toBeNull();
    expect([...(there?.transcript ?? [])]).toEqual([...(here?.transcript ?? [])]);
  });

  it('shows the same six-digit verification code at both ends', async () => {
    const { initiator, joiner } = await exchange();

    const code = initiator.parameters()?.verificationCode;

    expect(code).toMatch(/^\d{6}$/);
    expect(joiner.parameters()?.verificationCode).toBe(code);
  });

  it('reports the peer device rather than itself', async () => {
    const initiatorPeer = recordingPeer();
    const joinerPeer = recordingPeer();
    const initiator = await buildAdapter(initiatorPeer);
    const joiner = await buildAdapter(joinerPeer);

    const offer = await initiator.createOffer(offerOptions());
    const answer = await joiner.acceptOffer(offer);
    await initiator.acceptAnswer(answer);

    expect(initiator.parameters()?.deviceId).toBe(answer.deviceId);
    expect(joiner.parameters()?.deviceId).toBe(offer.deviceId);
  });

  it('has nothing to report before the exchange completes', async () => {
    const adapter = await buildAdapter(recordingPeer());

    await adapter.createOffer(offerOptions());

    expect(adapter.parameters()).toBeNull();
  });
});

describe('the authenticated deadline', () => {
  /** An exchange whose two halves were stamped at different instants. */
  const staggered = async (options: {
    offerExpiresAt: number;
    answerAt: number;
  }) => {
    const initiator = await buildAdapter(recordingPeer());
    // The joiner scans late, so the answer it mints runs past the offer it is
    // answering.
    const joiner = await buildAdapter(recordingPeer(), () => options.answerAt);

    const offer = await initiator.createOffer({
      sessionId: 'session-one',
      expiresAt: options.offerExpiresAt,
    });
    const answer = await joiner.acceptOffer(offer);
    await initiator.acceptAnswer(answer);

    return { initiator, joiner, offer, answer };
  };

  it('is the earlier of the two signed deadlines, on the initiator', async () => {
    const offerExpiresAt = NOW + 60_000;
    const { initiator, answer } = await staggered({
      offerExpiresAt,
      answerAt: NOW + 30_000,
    });

    // An answer minted later carries a later deadline. Adopting it would hand
    // the initiator a fresh window for a code whose own was nearly out.
    expect(answer.expiresAt).toBeGreaterThan(offerExpiresAt);
    expect(initiator.parameters()?.expiresAt).toBe(offerExpiresAt);
  });

  it('is the earlier of the two signed deadlines, on the joiner', async () => {
    const offerExpiresAt = NOW + 60_000;
    const { joiner } = await staggered({ offerExpiresAt, answerAt: NOW + 30_000 });

    // Both ends must agree, or the one with the longer window would still be
    // wrapping a root the other had already given up on.
    expect(joiner.parameters()?.expiresAt).toBe(offerExpiresAt);
  });

  it('keeps the answer’s deadline when it is the earlier one', async () => {
    // A joiner whose clock trails inside the tolerated skew mints the earlier
    // deadline of the two.
    const { initiator, joiner, answer } = await staggered({
      offerExpiresAt: NOW + SESSION_TTL_MILLIS,
      answerAt: NOW - 30_000,
    });
    expect(answer.expiresAt).toBeLessThan(NOW + SESSION_TTL_MILLIS);

    expect(initiator.parameters()?.expiresAt).toBe(answer.expiresAt);
    expect(joiner.parameters()?.expiresAt).toBe(answer.expiresAt);
  });
});

describe('dispose', () => {
  it('lets go of the session key and everything it authenticated', async () => {
    const { initiator } = await exchange();
    expect(initiator.sessionPrivateKey()).not.toBeNull();
    expect(initiator.parameters()).not.toBeNull();

    initiator.dispose();

    // An expired pairing that still holds its ephemeral key can still open a
    // wrapper sealed to it, which is the whole reason the deadline exists.
    expect(initiator.sessionPrivateKey()).toBeNull();
    expect(initiator.parameters()).toBeNull();
  });

  it('is idempotent, and leaves the adapter unable to continue', async () => {
    const { initiator } = await exchange();
    initiator.dispose();

    expect(() => initiator.dispose()).not.toThrow();
    // The session it was authenticating is gone, so an answer arriving late
    // has nothing to be checked against.
    await expect(
      initiator.acceptAnswer(
        await (await buildAdapter(recordingPeer())).acceptOffer(
          await (await buildAdapter(recordingPeer())).createOffer(offerOptions('other')),
        ),
      ),
    ).rejects.toBeInstanceOf(PairingError);
  });
});
