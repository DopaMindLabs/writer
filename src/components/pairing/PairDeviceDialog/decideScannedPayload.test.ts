import { describe, expect, it } from 'vitest';
import { asDeviceId } from 'writer-sync/core';
import {
  encodePairingPayload,
  type PairingAnswer,
  type PairingOffer,
} from 'writer-sync/pairing';
import { decideScannedPayload } from './decideScannedPayload';

/**
 * What a scanned code means for the device that scanned it.
 *
 * Nobody nominates a device: both offer and both watch, so the payload in hand
 * is the only thing that says which half this device runs.
 */

const SESSION = 'c2Vzc2lvbi1pZC0xMjM0';
const JWK = { kty: 'EC', crv: 'P-256', x: 'x'.repeat(43), y: 'y'.repeat(43) };

const HERE = 'AAAAdevice-id-0000';
const THERE = 'zzzzdevice-id-0000';

const offer = (deviceId: string): PairingOffer => ({
  v: 1,
  sessionId: SESSION,
  kind: 'offer',
  deviceId,
  identityJwk: JWK,
  ephemeralJwk: JWK,
  sdp: 'v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\na=candidate:offer\r\n',
  nonce: 'bm9uY2UtMDAwMDAwMDA',
  expiresAt: Date.now() + 120_000,
  signature: 'c2lnbmF0dXJl',
});

const answer = (deviceId: string): PairingAnswer => ({
  ...offer(deviceId),
  kind: 'answer',
  offerHash: 'b2ZmZXItaGFzaC0wMDAwMDAwMDAwMDAwMDAwMDAwMDAwMA',
});

describe('decideScannedPayload', () => {
  it('accepts a reply as the device whose offer was answered', async () => {
    const decision = await decideScannedPayload({
      deviceId: asDeviceId(HERE),
      payload: await encodePairingPayload(answer(THERE)),
    });

    expect(decision).toBe('accept-answer');
  });

  it('answers an offer it read, whichever device is holding it', async () => {
    // Reading is what decides. Ranking the two devices instead would leave the
    // reader waiting on a reply nobody was preparing.
    expect(
      await decideScannedPayload({
        deviceId: asDeviceId(HERE),
        payload: await encodePairingPayload(offer(THERE)),
      }),
    ).toBe('answer-offer');

    expect(
      await decideScannedPayload({
        deviceId: asDeviceId(THERE),
        payload: await encodePairingPayload(offer(HERE)),
      }),
    ).toBe('answer-offer');
  });

  it('names a device pointed at its own screen', async () => {
    const decision = await decideScannedPayload({
      deviceId: asDeviceId(HERE),
      payload: await encodePairingPayload(offer(HERE)),
    });

    expect(decision).toBe('own-code');
  });

  it('reports a payload it cannot read rather than guessing at one', async () => {
    const decision = await decideScannedPayload({
      deviceId: asDeviceId(HERE),
      payload: 'not a pairing payload',
    });

    expect(decision).toBe('unreadable');
  });
});
