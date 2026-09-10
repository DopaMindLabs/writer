import { describe, expect, it } from 'vitest';
import { asDeviceId } from '../core/ids';
import { resolvePairingRole } from './roleResolution';

const HERE = asDeviceId('aaa-device');
const THERE = asDeviceId('zzz-device');

describe('resolvePairingRole', () => {
  it('accepts an answer, whichever device sent it', () => {
    expect(
      resolvePairingRole({
        deviceId: HERE,
        payloadKind: 'answer',
        payloadDeviceId: THERE,
      }),
    ).toBe('accept-answer');
  });

  it('answers an offer it read, whichever device is holding it', () => {
    // Reading is the act that decides. Ranking the two devices instead would
    // leave the reader waiting whenever it sorted the wrong way — and in the
    // ordinary flow only one device ever reads anything.
    expect(
      resolvePairingRole({
        deviceId: HERE,
        payloadKind: 'offer',
        payloadDeviceId: THERE,
      }),
    ).toBe('answer-offer');

    expect(
      resolvePairingRole({
        deviceId: THERE,
        payloadKind: 'offer',
        payloadDeviceId: HERE,
      }),
    ).toBe('answer-offer');
  });

  it('refuses to answer its own offer', () => {
    // A device pointed at its own screen. Answering a description it authored
    // would pair the device with itself.
    expect(
      resolvePairingRole({
        deviceId: HERE,
        payloadKind: 'offer',
        payloadDeviceId: HERE,
      }),
    ).toBe('own-code');
  });

  it('refuses its own reply too, not just its own offer', () => {
    expect(
      resolvePairingRole({
        deviceId: HERE,
        payloadKind: 'answer',
        payloadDeviceId: HERE,
      }),
    ).toBe('own-code');
  });
});
