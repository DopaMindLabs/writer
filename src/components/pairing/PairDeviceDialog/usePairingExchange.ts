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
  failureActionFor,
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
 * and an unconfirmed peer must not be left holding an open channel. Resolves to
 * whether the session was taken, which is what tells teardown to leave it alone.
 */
const handOverSession = async (options: {
  catchUp: PeerCatchUp | null;
  opened: PairingSignaller | null;
  onExpired: () => void;
}): Promise<boolean> => {
  const { catchUp, opened, onExpired } = options;
  const peer = opened?.adapter.parameters();
  if (catchUp === null || !opened || !peer) return false;
  await catchUp.adopt({
    session: opened.session,
    deviceId: peer.deviceId,
    // What the root secret travels on. It goes with the session because this
    // is the moment a human confirmed the codes, and the ephemeral key it is
    // sealed to belongs to this exchange and dies with it.
    secretHandover: {
      peer,
      sessionPrivateKey: opened.adapter.sessionPrivateKey(),
      deviceId: opened.deviceId,
      onExpired: () => {
        // The exchange is over and its key material with it. Disposing here
        // rather than in the sync layer is what stops an ephemeral key
        // outliving the window it belongs to.
        opened.adapter.dispose();
        onExpired();
      },
    },
  });
  return true;
};

/**
 * Move a pairing whose window closed to its terminal state.
 *
 * A confirmation that arrives too late leaves a machine mid-transfer and a
 * dialog showing success. The machine refuses the transition once it is already
 * terminal — cancelled by a dismissal, say — and that refusal is nothing to
 * report: the pairing had ended either way.
 */
const expirePairing = (
  machine: PairingSession,
  dispatch: (action: PairingExchangeAction) => void,
): void => {
  try {
    machine.apply('expire');
  } catch {
    return;
  }
  dispatch({ type: 'failed', reason: 'expired' });
};

/**
 * Take the user's word that the digits match, and hand the connection on.
 *
 * The machine is the gate, not the caller: it refuses `confirmed` from any
 * state but `awaiting-confirmation`, so a stray call cannot skip ahead.
 *
 * "Devices paired" is dispatched only once adoption has recorded the peer:
 * adoption can refuse — a known device presenting a different identity key —
 * and a dialog that had already declared success would be lying about the one
 * thing it exists to establish. Resolves to whether the session was taken,
 * which is what tells teardown to leave it alone.
 */
const confirmPairing = async (options: {
  machine: PairingSession | null;
  signaller: PairingSignaller | null;
  catchUp: PeerCatchUp | null;
  dispatch: (action: PairingExchangeAction) => void;
}): Promise<boolean> => {
  const { machine, signaller, catchUp, dispatch } = options;
  if (machine?.state() !== PairingState.AwaitingConfirmation) return false;
  machine.apply('confirmed');
  try {
    const taken = await handOverSession({
      catchUp,
      opened: signaller,
      // Expiry arrives after this promise has resolved — the transfer runs on
      // its own — so it is reported here rather than thrown from adoption.
      onExpired: () => {
        expirePairing(machine, dispatch);
      },
    });
    dispatch({ type: 'confirmed' });
    return taken;
  } catch (error) {
    dispatch(failureActionFor(error));
    return false;
  }
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
    void confirmPairing({
      machine: session.current,
      signaller: signaller.current,
      catchUp,
      dispatch,
    }).then(markHandedOver);
  }, [catchUp, markHandedOver, signaller, session]);

  return { ...state, submitPayload, confirm };
};
