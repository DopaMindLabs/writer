/**
 * Whether a peer link is usable, in the terms a caller can act on.
 *
 * `RTCPeerConnection` reports six states; a caller has three decisions to make,
 * so the mapping is deliberately lossy.
 *
 * `disconnected` and `failed` both collapse to `interrupted`. They differ in
 * whether the browser still hopes to recover, and that difference is not
 * actionable here: Stage 2A signals only through the QR exchange, so once a
 * connection is down there is no channel to renegotiate over and no ICE restart
 * to attempt. Both mean "this link is not carrying anything, and getting it back
 * needs a fresh exchange". A link whose ICE re-checks succeed on their own
 * returns to `connected` through the ordinary event, so nothing is lost by
 * treating the two alike.
 */

export type PeerLinkState = 'connecting' | 'connected' | 'interrupted' | 'closed';

/**
 * The link state a raw `RTCPeerConnection.connectionState` amounts to.
 *
 * An unrecognised value is read as `connecting`: the honest reading of a state
 * this build does not know is that nothing has been established yet, and it is
 * the one answer that claims nothing — neither a working link nor a lost one.
 */
export const toPeerLinkState = (raw: string): PeerLinkState => {
  if (raw === 'connected') return 'connected';
  if (raw === 'disconnected' || raw === 'failed') return 'interrupted';
  if (raw === 'closed') return 'closed';
  return 'connecting';
};
