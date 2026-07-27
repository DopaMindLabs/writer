import { useCallback, useEffect, useReducer, useRef } from 'react';
import {
  PairingState,
  decodePairingPayload,
  type PairingSession,
} from 'writer-sync/pairing';
import {
  createPairingSignaller,
  type PairingSignaller,
  type PairingSignallerOptions,
} from '@/lib/writerSyncIntegration/createPairingSignaller';
import { gatherPairingOffer } from './gatherPairingOffer';
import {
  initialExchangeState,
  pairingExchangeReducer,
  type PairingExchangeState,
} from './pairingExchangeReducer';

/**
 * Drives the initiator's half of a pairing exchange for as long as the dialog
 * is open: gather an offer, take the peer's answer, authenticate, and hold at
 * the confirmation gate.
 *
 * The protocol's state machine runs alongside the view state and is the
 * authority on ordering. `awaiting-confirmation` is not a nicety — the account
 * root must never be wrapped before a human has compared the codes — so the
 * machine, not this hook, is what makes "never" checkable.
 */

export interface UsePairingExchangeOptions {
  open: boolean;
  /** Injected in tests and stories; defaults to the real wiring. */
  createSignaller?: (options?: PairingSignallerOptions) => Promise<PairingSignaller>;
}

export interface PairingExchange extends PairingExchangeState {
  /** Take the peer's reassembled answer payload. */
  acceptAnswer: (payload: string) => void;
  /** Record that the user has compared the codes and they match. */
  confirm: () => void;
}

export const usePairingExchange = ({
  open,
  createSignaller = createPairingSignaller,
}: UsePairingExchangeOptions): PairingExchange => {
  const [state, dispatch] = useReducer(pairingExchangeReducer, initialExchangeState);
  const signaller = useRef<PairingSignaller | null>(null);
  const session = useRef<PairingSession | null>(null);

  useEffect(() => {
    if (!open) return;

    let dismissed = false;
    dispatch({ type: 'restart' });

    void gatherPairingOffer({
      createSignaller,
      dispatch,
      isDismissed: () => dismissed,
      adopt: (opened, machine) => {
        signaller.current = opened;
        session.current = machine;
      },
    });

    return () => {
      dismissed = true;
      signaller.current?.close();
      signaller.current = null;
      session.current = null;
    };
  }, [open, createSignaller]);

  const acceptAnswer = useCallback((payload: string): void => {
    const opened = signaller.current;
    const machine = session.current;
    if (opened === null || machine === null) return;

    const authenticate = async (): Promise<void> => {
      try {
        machine.apply('peer-payload-received');
        dispatch({ type: 'answer-received' });
        const answer = await decodePairingPayload(payload);
        if (answer.kind !== 'answer') throw new Error('not an answer payload');
        const peer = await opened.adapter.acceptAnswer(answer);
        machine.apply('authenticated');
        dispatch({ type: 'authenticated', peer });
      } catch {
        machine.apply('fail');
        dispatch({ type: 'failed' });
      }
    };

    void authenticate();
  }, []);

  const confirm = useCallback((): void => {
    const machine = session.current;
    // The machine is the gate, not this check: it refuses `confirmed` from any
    // state but `awaiting-confirmation`, so a stray call cannot skip ahead.
    if (machine?.state() !== PairingState.AwaitingConfirmation) return;
    machine.apply('confirmed');
    dispatch({ type: 'confirmed' });
  }, []);

  return { ...state, acceptAnswer, confirm };
};
