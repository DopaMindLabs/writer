import { describe, expect, it } from 'vitest';
import { asDeviceId } from '../core/ids';
import { resolvePairingRole } from './roleResolution';

const LOWER = asDeviceId('aaa-device');
const HIGHER = asDeviceId('zzz-device');

describe('resolvePairingRole', () => {
  it('accepts an answer, whichever device sent it', () => {
    expect(
      resolvePairingRole({
        deviceId: LOWER,
        payloadKind: 'answer',
        payloadDeviceId: HIGHER,
      }),
    ).toBe('accept-answer');

    expect(
      resolvePairingRole({
        deviceId: HIGHER,
        payloadKind: 'answer',
        payloadDeviceId: LOWER,
      }),
    ).toBe('accept-answer');
  });

  it('answers an offer when this device holds the greater id', () => {
    expect(
      resolvePairingRole({
        deviceId: HIGHER,
        payloadKind: 'offer',
        payloadDeviceId: LOWER,
      }),
    ).toBe('answer-offer');
  });

  it('waits instead of answering when this device holds the lesser id', () => {
    expect(
      resolvePairingRole({
        deviceId: LOWER,
        payloadKind: 'offer',
        payloadDeviceId: HIGHER,
      }),
    ).toBe('wait-for-answer');
  });

  it('leaves exactly one answerer when both devices scan', () => {
    // The race the rule exists for: each device holds the other's offer. If both
    // answered, both would wait for a reply neither is going to send.
    const onLower = resolvePairingRole({
      deviceId: LOWER,
      payloadKind: 'offer',
      payloadDeviceId: HIGHER,
    });
    const onHigher = resolvePairingRole({
      deviceId: HIGHER,
      payloadKind: 'offer',
      payloadDeviceId: LOWER,
    });

    expect([onLower, onHigher].filter((role) => role === 'answer-offer')).toHaveLength(1);
    expect([onLower, onHigher].filter((role) => role === 'wait-for-answer')).toHaveLength(
      1,
    );
  });

  it('refuses to answer its own offer', () => {
    // A device pointed at its own screen resolves to waiting, which goes
    // nowhere — rather than answering a description it authored itself.
    expect(
      resolvePairingRole({
        deviceId: LOWER,
        payloadKind: 'offer',
        payloadDeviceId: LOWER,
      }),
    ).toBe('wait-for-answer');
  });

  it('orders by the id itself, not by its length', () => {
    // Lexicographic on the derived id: a shorter id is not automatically lesser,
    // and both devices must compute the same winner from the same two values.
    const short = asDeviceId('b');
    const long = asDeviceId('aaaaaaaa');

    expect(
      resolvePairingRole({
        deviceId: short,
        payloadKind: 'offer',
        payloadDeviceId: long,
      }),
    ).toBe('answer-offer');
    expect(
      resolvePairingRole({
        deviceId: long,
        payloadKind: 'offer',
        payloadDeviceId: short,
      }),
    ).toBe('wait-for-answer');
  });
});
