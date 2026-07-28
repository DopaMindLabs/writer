import { useCallback, useEffect, useReducer } from 'react';
import { PairingState, type PairingSession } from 'writer-sync/pairing';
import { usePeerCatchUp } from '@/lib/writerSyncIntegration/peerCatchUpContext';
import type { PeerCatchUp } from '@/lib/writerSyncIntegration/peerCatchUp';
import {
  createPairingSignaller,
  type PairingSignaller,
  type PairingSignallerOptions,
} from '@/lib/writerSyncIntegration/createPairingSignaller';
import { startPairingExchange } from './startPairingExchange';
import { takeScannedPayload } from './takeScannedPayload';
import { usePairingSessionRefs } from './usePairingSessionRefs';
import {
  initialExchangeState,
  pairingExchangeReducer,
  type PairingExchangeAction,
  type PairingExchangeState,
} from './pairingExchangeReducer';

/**
 * Drives one half of a pairing exchange for as long as the dialog is open —
 * which half being something this device discovers rather than something the
 * user is asked.
 *
 * Every device offers its own code and watches for the other's. The first
 * payload to arrive settles the roles (`resolvePairingRole`), so neither person
 * has to work out which device goes first, and the case where both scanned
 * resolves without a further round trip.
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
  /** Take a payload read from the other device, whatever half it turns out to be. */
  submitPayload: (payload: string) => void;
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
  catchUp.adopt({
    session: opened.session,
    deviceId: peer.deviceId,
    // What the account root travels on. It goes with the session because this
    // is the moment a human confirmed the codes, and the ephemeral key it is
    // sealed to belongs to this exchange and dies with it.
    keyTransfer: { peer, sessionPrivateKey: opened.adapter.sessionPrivateKey() },
  });
  return true;
};

/**
 * Take the user's word that the digits match, and hand the connection on.
 *
 * The machine is the gate, not the caller: it refuses `confirmed` from any
 * state but `awaiting-confirmation`, so a stray call cannot skip ahead. Returns
 * whether the session was taken, which is what tells teardown to leave it alone.
 */
const confirmPairing = (options: {
  machine: PairingSession | null;
  signaller: PairingSignaller | null;
  catchUp: PeerCatchUp | null;
  dispatch: (action: PairingExchangeAction) => void;
}): boolean => {
  const { machine, signaller, catchUp, dispatch } = options;
  if (machine?.state() !== PairingState.AwaitingConfirmation) return false;
  machine.apply('confirmed');
  const taken = handOverSession(catchUp, signaller);
  dispatch({ type: 'confirmed' });
  return taken;
};

export const usePairingExchange = ({
  open,
  createSignaller = createPairingSignaller,
}: UsePairingExchangeOptions): PairingExchange => {
  const [state, dispatch] = useReducer(pairingExchangeReducer, initialExchangeState);
  const catchUp = usePeerCatchUp();
  const live = usePairingSessionRefs(open);
  const { signaller, session, isDismissed, adopt, markHandedOver } = live;

  useEffect(() => {
    if (!open) return;
    void startPairingExchange({
      role: 'initiator',
      createSignaller,
      dispatch,
      isDismissed,
      adopt,
    });
  }, [open, createSignaller, isDismissed, adopt]);

  const submitPayload = useCallback(
    (payload: string): void => {
      const opened = signaller.current;
      const machine = session.current;
      if (opened === null || machine === null) return;
      void takeScannedPayload({
        payload,
        signaller: opened,
        machine,
        createSignaller,
        isDismissed,
        adopt,
        dispatch,
      });
    },
    [createSignaller, isDismissed, adopt, signaller, session],
  );

  const confirm = useCallback((): void => {
    markHandedOver(
      confirmPairing({
        machine: session.current,
        signaller: signaller.current,
        catchUp,
        dispatch,
      }),
    );
  }, [catchUp, markHandedOver, signaller, session]);

  return { ...state, submitPayload, confirm };
};
