import { useCallback, useEffect, useReducer, useRef } from 'react';
import { PairingState, type PairingRole, type PairingSession } from 'writer-sync/pairing';
import { usePeerCatchUp } from '@/lib/writerSyncIntegration/peerCatchUpContext';
import type { PeerCatchUp } from '@/lib/writerSyncIntegration/peerCatchUp';
import {
  createPairingSignaller,
  type PairingSignaller,
  type PairingSignallerOptions,
} from '@/lib/writerSyncIntegration/createPairingSignaller';
import { acceptPairingAnswer } from './acceptPairingAnswer';
import { answerPairingOffer } from './answerPairingOffer';
import { startPairingExchange } from './startPairingExchange';
import {
  initialExchangeState,
  pairingExchangeReducer,
  type PairingExchangeState,
} from './pairingExchangeReducer';

/**
 * Drives one half of a pairing exchange for as long as the dialog is open.
 *
 * Which half is the user's choice, made once and never switched: a device that
 * changed role mid-exchange would be holding a connection answered against a
 * description it had also authored.
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
  /** Choose which half of the exchange this device runs. */
  begin: (role: PairingRole) => void;
  /** Take the peer's reassembled offer payload (joiner). */
  submitOffer: (payload: string) => void;
  /** Take the peer's reassembled answer payload (initiator). */
  acceptAnswer: (payload: string) => void;
  /** Record that the user has compared the codes and they match. */
  confirm: () => void;
}

/**
 * Hand a confirmed pairing's connection to the holder that outlives this dialog.
 *
 * Only ever after confirmation: before it no human has agreed the codes match,
 * and an unconfirmed peer must not be left holding an open channel. Returns
 * whether the session was taken, which is what tells teardown to leave it alone.
 */
const handOverSession = (
  catchUp: PeerCatchUp | null,
  opened: PairingSignaller | null,
): boolean => {
  const peer = opened?.adapter.parameters();
  if (catchUp === null || !opened || !peer) return false;
  catchUp.adopt({ session: opened.session, deviceId: peer.deviceId });
  return true;
};

export const usePairingExchange = ({
  open,
  createSignaller = createPairingSignaller,
}: UsePairingExchangeOptions): PairingExchange => {
  const [state, dispatch] = useReducer(pairingExchangeReducer, initialExchangeState);
  const catchUp = usePeerCatchUp();
  const signaller = useRef<PairingSignaller | null>(null);
  // Set once the session has been handed on, so teardown stops closing it.
  const adopted = useRef(false);
  const session = useRef<PairingSession | null>(null);
  const dismissed = useRef(false);
  const { role } = state;

  useEffect(() => {
    if (!open) return;
    dismissed.current = false;
    return () => {
      dismissed.current = true;
      // A session handed to the catch-up holder is no longer this dialog's to
      // close: sync has to keep the connection the pairing established.
      if (!adopted.current) signaller.current?.close();
      adopted.current = false;
      signaller.current = null;
      session.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open || role === null) return;

    void startPairingExchange({
      role,
      createSignaller,
      dispatch,
      isDismissed: () => dismissed.current,
      adopt: (opened, machine) => {
        signaller.current = opened;
        session.current = machine;
      },
    });
  }, [open, role, createSignaller]);

  const begin = useCallback((chosen: PairingRole): void => {
    dispatch({ type: 'begin', role: chosen });
  }, []);

  const submitOffer = useCallback((payload: string): void => {
    const opened = signaller.current;
    const machine = session.current;
    if (opened === null || machine === null) return;
    void answerPairingOffer({ payload, signaller: opened, machine, dispatch });
  }, []);

  const acceptAnswer = useCallback((payload: string): void => {
    const opened = signaller.current;
    const machine = session.current;
    if (opened === null || machine === null) return;
    void acceptPairingAnswer({ payload, signaller: opened, machine, dispatch });
  }, []);

  const confirm = useCallback((): void => {
    const machine = session.current;
    // The machine is the gate, not this check: it refuses `confirmed` from any
    // state but `awaiting-confirmation`, so a stray call cannot skip ahead.
    if (machine?.state() !== PairingState.AwaitingConfirmation) return;
    machine.apply('confirmed');
    adopted.current = handOverSession(catchUp, signaller.current);
    dispatch({ type: 'confirmed' });
  }, [catchUp]);

  return { ...state, begin, submitOffer, acceptAnswer, confirm };
};
