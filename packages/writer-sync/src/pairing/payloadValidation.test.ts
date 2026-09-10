import { describe, expect, it } from 'vitest';
import {
  deviceIdFor,
  generateDeviceIdentity,
  publicJwkOf,
  type DeviceIdentityKeys,
} from '../crypto/deviceIdentity';
import { signPairingPayload } from '../crypto/deviceSignature';
import {
  ephemeralPublicJwkOf,
  generatePairingEphemeral,
} from '../crypto/pairingKeyAgreement';
import { PairingError, PairingErrorCode, type PairingOffer } from './pairing.types';
import { MAX_SESSION_TTL_MILLIS, validateInboundPayload } from './payloadValidation';
import { MAX_CLOCK_SKEW_MILLIS, createReplayCache } from './replayCache';

const NOW = 1_700_000_000_000;
const SESSION = 'ICEiIyQlJicoKSorLC0uLw';

/** Build a genuinely signed offer from a real identity, as a peer would. */
const signedOffer = async (
  overrides: Partial<PairingOffer> = {},
  identity?: DeviceIdentityKeys,
): Promise<{ payload: PairingOffer; identity: DeviceIdentityKeys }> => {
  const keys = identity ?? (await generateDeviceIdentity());
  const ephemeral = await generatePairingEphemeral();
  const unsigned: Omit<PairingOffer, 'signature'> = {
    v: 1,
    kind: 'offer',
    sessionId: SESSION,
    deviceId: String(await deviceIdFor(keys.publicKey)),
    identityJwk: await publicJwkOf(keys.publicKey),
    ephemeralJwk: await ephemeralPublicJwkOf(ephemeral.publicKey),
    sdp: 'v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\n',
    nonce: 'EBESExQVFhcYGRobHB0eHw',
    expiresAt: NOW + 120_000,
    ...overrides,
  } as Omit<PairingOffer, 'signature'>;
  const signature = await signPairingPayload(keys.privateKey, unsigned);
  return { payload: { ...unsigned, signature }, identity: keys };
};

const validate = async (payload: PairingOffer, at = NOW): Promise<CryptoKey> =>
  validateInboundPayload({
    payload,
    expectedSessionId: SESSION,
    replayCache: createReplayCache(() => at),
    now: at,
  });

const codeOf = async (run: () => Promise<unknown>): Promise<PairingErrorCode> => {
  try {
    await run();
  } catch (error) {
    expect(error).toBeInstanceOf(PairingError);
    return (error as PairingError).code;
  }
  throw new Error('expected a PairingError');
};

describe('validateInboundPayload', () => {
  it('accepts a well-formed, freshly signed payload', async () => {
    const { payload } = await signedOffer();
    await expect(validate(payload)).resolves.toBeDefined();
  });

  it('returns the peer public key so the caller need not re-import it', async () => {
    const { payload, identity } = await signedOffer();
    const key = await validate(payload);
    expect(await deviceIdFor(key)).toBe(await deviceIdFor(identity.publicKey));
  });
});

describe('freshness', () => {
  it('rejects an expired payload', async () => {
    const { payload } = await signedOffer({ expiresAt: NOW - 1 });
    expect(await codeOf(() => validate(payload))).toBe(PairingErrorCode.Expired);
  });

  it('rejects an expiry implausibly far ahead', async () => {
    // A hostile clock must not be able to mint a payload valid for a year.
    const far = NOW + MAX_SESSION_TTL_MILLIS + MAX_CLOCK_SKEW_MILLIS + 1_000;
    const { payload } = await signedOffer({ expiresAt: far });
    expect(await codeOf(() => validate(payload))).toBe(PairingErrorCode.Expired);
  });

  it('rejects a payload for a different session', async () => {
    const { payload } = await signedOffer({ sessionId: 'QUJDREVGR0hJSktMTU5PUA' });
    expect(await codeOf(() => validate(payload))).toBe(PairingErrorCode.SessionMismatch);
  });
});

describe('replay', () => {
  it('rejects the same payload presented twice', async () => {
    const { payload } = await signedOffer();
    const cache = createReplayCache(() => NOW);
    const once = () =>
      validateInboundPayload({
        payload,
        expectedSessionId: SESSION,
        replayCache: cache,
        now: NOW,
      });
    await expect(once()).resolves.toBeDefined();
    expect(await codeOf(once)).toBe(PairingErrorCode.ReplayedNonce);
  });

  it('claims the nonce before verifying the signature', async () => {
    // Order matters: a duplicate racing the original must lose even if the
    // expensive checks would have passed for both.
    const { payload } = await signedOffer();
    const cache = createReplayCache(() => NOW);
    const results = await Promise.allSettled([
      validateInboundPayload({ payload, expectedSessionId: SESSION, replayCache: cache, now: NOW }),
      validateInboundPayload({ payload, expectedSessionId: SESSION, replayCache: cache, now: NOW }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });
});

describe('identity', () => {
  it('rejects a payload asserting a device id its key does not derive', async () => {
    const { payload } = await signedOffer({ deviceId: 'AAAAAAAAAAAAAAAAAAAAAA' });
    expect(await codeOf(() => validate(payload))).toBe(PairingErrorCode.IdentityMismatch);
  });

  it('rejects a payload signed by a different device', async () => {
    const { payload } = await signedOffer();
    const impostor = await generateDeviceIdentity();
    // Same body, but presenting the impostor's key and matching device id.
    const swapped: PairingOffer = {
      ...payload,
      deviceId: String(await deviceIdFor(impostor.publicKey)),
      identityJwk: await publicJwkOf(impostor.publicKey),
    };
    expect(await codeOf(() => validate(swapped))).toBe(PairingErrorCode.BadSignature);
  });

  it('rejects a payload whose body was altered after signing', async () => {
    const { payload } = await signedOffer();
    const tampered = { ...payload, sdp: 'v=0\r\no=- 9 9 IN IP4 10.0.0.9\r\n' };
    expect(await codeOf(() => validate(tampered))).toBe(PairingErrorCode.BadSignature);
  });
});

describe('answers', () => {
  const signedAnswer = async (offerHash: string) => {
    const keys = await generateDeviceIdentity();
    const ephemeral = await generatePairingEphemeral();
    const unsigned = {
      v: 1 as const,
      kind: 'answer' as const,
      sessionId: SESSION,
      deviceId: String(await deviceIdFor(keys.publicKey)),
      identityJwk: await publicJwkOf(keys.publicKey),
      ephemeralJwk: await ephemeralPublicJwkOf(ephemeral.publicKey),
      sdp: 'v=0\r\no=- 2 2 IN IP4 127.0.0.1\r\n',
      nonce: 'QEFCQ0RFRkdISUpLTE1OTw',
      expiresAt: NOW + 120_000,
      offerHash,
    };
    return { ...unsigned, signature: await signPairingPayload(keys.privateKey, unsigned) };
  };

  const validateAnswer = async (
    answer: Awaited<ReturnType<typeof signedAnswer>>,
    expectedOfferHash?: string,
  ) =>
    validateInboundPayload({
      payload: answer,
      expectedSessionId: SESSION,
      replayCache: createReplayCache(() => NOW),
      now: NOW,
      expectedOfferHash,
    });

  it('accepts an answer bound to the offer that was sent', async () => {
    const answer = await signedAnswer('UFFSU1RVVldYWVpbXF1eXw');
    await expect(validateAnswer(answer, 'UFFSU1RVVldYWVpbXF1eXw')).resolves.toBeDefined();
  });

  it('rejects an answer bound to a different offer', async () => {
    // This is what catches a substituted offer without waiting for a human.
    const answer = await signedAnswer('AAAAAAAAAAAAAAAAAAAAAA');
    expect(await codeOf(() => validateAnswer(answer, 'UFFSU1RVVldYWVpbXF1eXw'))).toBe(
      PairingErrorCode.TranscriptMismatch,
    );
  });

  it('refuses to check an answer when no offer hash was supplied', async () => {
    const answer = await signedAnswer('UFFSU1RVVldYWVpbXF1eXw');
    expect(await codeOf(() => validateAnswer(answer))).toBe(
      PairingErrorCode.TranscriptMismatch,
    );
  });
});
