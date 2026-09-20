import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type { PairingSession } from 'writer-sync/pairing';
import type { PairingSignaller } from '@/lib/writerSyncIntegration/createPairingSignaller';

/**
 * What this dialog currently has open, and when it stops being its to close.
 *
 * Separate from the exchange itself because they answer different questions: the
 * exchange decides what happens next, this decides what exists and for how long.
 * Both roles run through the same connection, and a role change replaces it, so
 * a single place has to know which one is live.
 */

export interface PairingSessionRefs {
  signaller: RefObject<PairingSignaller | null>;
  session: RefObject<PairingSession | null>;
  /** Whether the dialog has closed since something began. */
  isDismissed: () => boolean;
  /** Take a newly opened session as the live one. */
  adopt: (signaller: PairingSignaller, machine: PairingSession) => void;
  /**
   * Record that the connection was handed to the catch-up holder. A session
   * handed on is no longer this dialog's to close: sync has to keep the
   * connection the pairing established.
   */
  markHandedOver: (taken: boolean) => void;
}

export const usePairingSessionRefs = (open: boolean): PairingSessionRefs => {
  const signaller = useRef<PairingSignaller | null>(null);
  const session = useRef<PairingSession | null>(null);
  const handedOver = useRef(false);
  const dismissed = useRef(false);

  const adopt = useCallback((opened: PairingSignaller, machine: PairingSession): void => {
    signaller.current = opened;
    session.current = machine;
  }, []);

  useEffect(() => {
    if (!open) return;
    dismissed.current = false;
    return () => {
      dismissed.current = true;
      if (!handedOver.current) signaller.current?.close();
      handedOver.current = false;
      signaller.current = null;
      session.current = null;
    };
  }, [open]);

  return {
    signaller,
    session,
    isDismissed: useCallback(() => dismissed.current, []),
    adopt,
    markHandedOver: useCallback((taken: boolean) => {
      handedOver.current = taken;
    }, []),
  };
};
