import { useEffect, useState } from 'react';
import { SESSION_TTL_MILLIS, encodePairingPayload } from 'writer-sync/pairing';
import {
  createPairingSignaller,
  type PairingSignaller,
  type PairingSignallerOptions,
} from '@/lib/writerSyncIntegration/createPairingSignaller';

/**
 * Gather this device's offer and encode it for display, for as long as the
 * dialog is open.
 *
 * Gathering opens a real peer connection, so the effect's cleanup closes it —
 * including when the dialog is dismissed while gathering is still in flight.
 * Leaving a connection open after the dialog has gone would keep a half-formed
 * pairing session alive with nothing on screen to cancel it.
 */

export type PairingOfferStatus = 'creating' | 'ready' | 'failed';

export interface PairingOfferState {
  status: PairingOfferStatus;
  /** The encoded payload text, once gathering has completed. */
  payload: string | null;
  sessionId: string | null;
}

export interface UsePairingOfferOptions {
  open: boolean;
  /** Injected in tests and stories; defaults to the real wiring. */
  createSignaller?: (options?: PairingSignallerOptions) => Promise<PairingSignaller>;
}

const GATHERING: PairingOfferState = { status: 'creating', payload: null, sessionId: null };

export const usePairingOffer = ({
  open,
  createSignaller = createPairingSignaller,
}: UsePairingOfferOptions): PairingOfferState => {
  const [state, setState] = useState<PairingOfferState>(GATHERING);

  useEffect(() => {
    if (!open) return;

    let dismissed = false;
    let signaller: PairingSignaller | null = null;
    // Read through a call rather than the variable: the flag is set by the
    // cleanup between awaits, which narrowing cannot see.
    const isDismissed = (): boolean => dismissed;
    setState(GATHERING);

    const gather = async (): Promise<void> => {
      try {
        const opened = await createSignaller();
        signaller = opened;
        // Dismissed while gathering: close what was opened rather than leaving
        // a connection behind for the garbage collector to maybe notice.
        if (isDismissed()) {
          opened.close();
          return;
        }
        const offer = await opened.adapter.createOffer({
          sessionId: opened.sessionId,
          expiresAt: Date.now() + SESSION_TTL_MILLIS,
        });
        const payload = await encodePairingPayload(offer);
        if (isDismissed()) return;
        setState({ status: 'ready', payload, sessionId: offer.sessionId });
      } catch {
        // The reason is for developers, not for a dialog: a pairing error must
        // never put peer-supplied text on screen (threat model §5.11).
        if (!isDismissed()) setState({ status: 'failed', payload: null, sessionId: null });
      }
    };

    void gather();

    return () => {
      dismissed = true;
      signaller?.close();
    };
  }, [open, createSignaller]);

  return state;
};
