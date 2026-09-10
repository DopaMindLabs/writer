import { createContext, useContext } from 'react';
import type { PeerCatchUp } from './peerCatchUp';

/**
 * Makes the peer catch-up reachable from the pairing dialog.
 *
 * The dialog is where a pairing is confirmed, but it is the wrong place to own
 * what follows: it unmounts on dismissal, and anything it held would go with it.
 * Handing the session to a holder published from above is what lets a connection
 * outlive the conversation that created it.
 *
 * `null` outside a provider is deliberate and is the normal case in tests and
 * stories: a dialog rendered on its own pairs perfectly well, it simply has
 * nowhere to hand the session afterwards.
 */
export const PeerCatchUpContext = createContext<PeerCatchUp | null>(null);

export const usePeerCatchUp = (): PeerCatchUp | null => useContext(PeerCatchUpContext);
