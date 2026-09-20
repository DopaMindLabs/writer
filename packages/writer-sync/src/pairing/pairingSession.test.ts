import { describe, expect, it } from 'vitest';
import { PairingError, PairingErrorCode, PairingState } from './pairing.types';
import { createPairingSession, type PairingEvent } from './pairingSession';

const drive = (
  session: ReturnType<typeof createPairingSession>,
  events: readonly PairingEvent[],
): PairingState => {
  let last = session.state();
  for (const event of events) last = session.apply(event);
  return last;
};

/** Initiator events from idle up to (and including) reaching confirmation. */
const TO_CONFIRMATION: readonly PairingEvent[] = [
  'start',
  'payload-ready',
  'peer-payload-received',
  'authenticated',
];

describe('createPairingSession', () => {
  it('starts idle for both roles', () => {
    expect(createPairingSession('initiator').state()).toBe(PairingState.Idle);
    expect(createPairingSession('joiner').state()).toBe(PairingState.Idle);
  });

  it('walks the initiator through create-then-wait', () => {
    const session = createPairingSession('initiator');
    expect(session.apply('start')).toBe(PairingState.Creating);
    expect(session.apply('payload-ready')).toBe(PairingState.AwaitingPeer);
    expect(session.apply('peer-payload-received')).toBe(PairingState.Authenticating);
  });

  it('walks the joiner through wait-then-create', () => {
    const session = createPairingSession('joiner');
    expect(session.apply('start')).toBe(PairingState.AwaitingPeer);
    expect(session.apply('peer-payload-received')).toBe(PairingState.Creating);
    expect(session.apply('payload-ready')).toBe(PairingState.Authenticating);
  });

  it('rejects the other role’s ordering', () => {
    // The initiator gathers before it waits; the joiner waits before it
    // gathers. Neither may accept the other's sequence.
    const initiator = createPairingSession('initiator');
    initiator.apply('start');
    expect(() => initiator.apply('peer-payload-received')).toThrow(PairingError);

    const joiner = createPairingSession('joiner');
    joiner.apply('start');
    expect(() => joiner.apply('payload-ready')).toThrow(PairingError);
  });

  it('reaches complete along the full happy path', () => {
    const session = createPairingSession('initiator');
    const final = drive(session, [
      ...TO_CONFIRMATION,
      'confirmed',
      'keys-transferred',
    ]);
    expect(final).toBe(PairingState.Complete);
  });
});

describe('confirmation gate', () => {
  it('refuses key transfer until the user has confirmed', () => {
    const session = createPairingSession('initiator');
    drive(session, TO_CONFIRMATION);
    expect(session.state()).toBe(PairingState.AwaitingConfirmation);
    // This is the whole point of the state: connectivity is not consent.
    expect(session.mayTransferKeys()).toBe(false);
  });

  it('permits key transfer only in transferring-keys', () => {
    const session = createPairingSession('initiator');
    drive(session, [...TO_CONFIRMATION, 'confirmed']);
    expect(session.state()).toBe(PairingState.TransferringKeys);
    expect(session.mayTransferKeys()).toBe(true);
  });

  it('refuses key transfer once complete', () => {
    const session = createPairingSession('initiator');
    drive(session, [...TO_CONFIRMATION, 'confirmed', 'keys-transferred']);
    expect(session.mayTransferKeys()).toBe(false);
  });

  it('cannot skip confirmation to reach key transfer', () => {
    const session = createPairingSession('initiator');
    drive(session, ['start', 'payload-ready', 'peer-payload-received']);
    expect(() => session.apply('keys-transferred')).toThrow(PairingError);
    expect(session.mayTransferKeys()).toBe(false);
  });
});

describe('invalid transitions', () => {
  it('rejects an event that does not belong to the current state', () => {
    const session = createPairingSession('initiator');
    expect(() => session.apply('confirmed')).toThrow(PairingError);
  });

  it('reports invalid-state rather than a generic failure', () => {
    const session = createPairingSession('initiator');
    try {
      session.apply('authenticated');
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(PairingError);
      expect((error as PairingError).code).toBe(PairingErrorCode.InvalidState);
    }
  });

  it('rejects a duplicate advancing event', () => {
    // A second scan of the same symbol must not skip a step.
    const session = createPairingSession('initiator');
    session.apply('start');
    expect(() => session.apply('start')).toThrow(PairingError);
  });
});

describe('terminal states', () => {
  const aborts: readonly (readonly [PairingEvent, PairingState])[] = [
    ['expire', PairingState.Expired],
    ['cancel', PairingState.Cancelled],
    ['fail', PairingState.Failed],
  ];

  for (const [event, expected] of aborts) {
    it(`moves to ${expected} on ${event} from any live state`, () => {
      const session = createPairingSession('initiator');
      drive(session, ['start', 'payload-ready']);
      expect(session.apply(event)).toBe(expected);
    });
  }

  it('accepts no further event once terminal', () => {
    const session = createPairingSession('initiator');
    session.apply('cancel');
    expect(() => session.apply('start')).toThrow(PairingError);
  });

  it('cannot be revived by a late scan', () => {
    const session = createPairingSession('joiner');
    session.apply('expire');
    expect(() => session.apply('peer-payload-received')).toThrow(PairingError);
    expect(session.state()).toBe(PairingState.Expired);
  });

  it('refuses key transfer in every terminal state', () => {
    for (const [event] of aborts) {
      const session = createPairingSession('initiator');
      drive(session, TO_CONFIRMATION);
      session.apply(event);
      expect(session.mayTransferKeys()).toBe(false);
    }
  });
});
