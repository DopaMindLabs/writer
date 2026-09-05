import {
  PairingError,
  PairingErrorCode,
  PairingState,
  isTerminalPairingState,
} from './pairing.types';

/**
 * The pairing state machine, specified in `docs/pairing-protocol.md` §12.
 *
 * Modelled as a machine rather than a bag of UI callbacks because the ordering
 * *is* the security property: `awaiting-confirmation` exists so that the root
 * root is never wrapped before a human has compared the verification code, and a
 * machine is what makes "never" checkable. Every transition validates the state
 * it is leaving, so an event arriving out of order is a typed error rather than
 * a silently accepted retry.
 *
 * Initiator and joiner are separate roles because their happy paths differ: the
 * initiator creates before it waits, the joiner waits before it creates.
 */

export type PairingRole = 'initiator' | 'joiner';

/** The events that drive a session forward. */
export type PairingEvent =
  | 'start'
  | 'payload-ready'
  | 'peer-payload-received'
  | 'authenticated'
  | 'confirmed'
  | 'keys-transferred'
  | 'expire'
  | 'cancel'
  | 'fail';

interface PairingStep {
  event: PairingEvent;
  to: PairingState;
}

/**
 * The happy path per role, as (event, next state) pairs.
 *
 * The two roles share every state but not their order, which is why this is a
 * table per role rather than one sequence with a role flag: the initiator
 * gathers its offer *before* it waits for a scan, and the joiner waits *before*
 * it gathers its answer. Collapsing them would let each role accept the other's
 * ordering, which is precisely the confusion a state machine is here to prevent.
 */
const SEQUENCE: Readonly<Record<PairingRole, readonly PairingStep[]>> = {
  initiator: [
    { event: 'start', to: PairingState.Creating },
    { event: 'payload-ready', to: PairingState.AwaitingPeer },
    { event: 'peer-payload-received', to: PairingState.Authenticating },
    { event: 'authenticated', to: PairingState.AwaitingConfirmation },
    { event: 'confirmed', to: PairingState.TransferringKeys },
    { event: 'keys-transferred', to: PairingState.Complete },
  ],
  joiner: [
    { event: 'start', to: PairingState.AwaitingPeer },
    { event: 'peer-payload-received', to: PairingState.Creating },
    { event: 'payload-ready', to: PairingState.Authenticating },
    { event: 'authenticated', to: PairingState.AwaitingConfirmation },
    { event: 'confirmed', to: PairingState.TransferringKeys },
    { event: 'keys-transferred', to: PairingState.Complete },
  ],
};

const ABORT_STATES: Readonly<Partial<Record<PairingEvent, PairingState>>> = {
  expire: PairingState.Expired,
  cancel: PairingState.Cancelled,
  fail: PairingState.Failed,
};

export interface PairingSession {
  readonly role: PairingRole;
  state: () => PairingState;
  /** Apply an event, or throw {@link PairingError} if it does not belong here. */
  apply: (event: PairingEvent) => PairingState;
  /** Whether key transfer is permitted right now (§11, §12). */
  mayTransferKeys: () => boolean;
}

/**
 * A session for one role. Sessions are single-use: once terminal, every further
 * event is rejected, so a cancelled or expired session cannot be nudged back
 * into life by a late scan.
 */
export const createPairingSession = (role: PairingRole): PairingSession => {
  const sequence = SEQUENCE[role];
  let current = PairingState.Idle;
  // The position in the sequence, not a search for `current`: two steps could
  // share a state in a future revision, and a search would silently pick one.
  let step = 0;

  return {
    role,
    state: () => current,
    apply: (event) => {
      if (isTerminalPairingState(current)) {
        throw new PairingError(PairingErrorCode.InvalidState, `${current} is terminal`);
      }
      const abort = ABORT_STATES[event];
      if (abort !== undefined) {
        current = abort;
        return current;
      }
      // Only the one event this step expects advances the machine. That is what
      // turns a duplicated scan into an error rather than a skipped step.
      if (step >= sequence.length) {
        throw new PairingError(PairingErrorCode.InvalidState, `${current} does not advance`);
      }
      const expected = sequence[step];
      if (expected.event !== event) {
        throw new PairingError(
          PairingErrorCode.InvalidState,
          `${current} expects ${expected.event}, got ${event}`,
        );
      }
      current = expected.to;
      step += 1;
      return current;
    },
    mayTransferKeys: () => current === PairingState.TransferringKeys,
  };
};
