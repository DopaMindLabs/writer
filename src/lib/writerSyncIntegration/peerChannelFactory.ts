import type { PeerChannelFactory } from 'writer-sync/providers/webrtc';
import type { DataChannelLike } from 'writer-sync/providers/webrtc';
import { peerSessions, type PeerSessionRegistry } from './peerSessionRegistry';

/**
 * Where the P2P provider gets a channel from.
 *
 * The provider asks for one per scope and logical channel and knows nothing
 * about pairing; this resolves that against whichever peer is actually
 * connected. A device with no peer yet waits rather than failing: opening a
 * document before pairing is ordinary, and a rejection here would be a failure
 * nothing ever retries.
 *
 * One peer, for now. Fanning a scope out across several paired devices is a
 * different problem — a send has to reach all of them and a receipt has to be
 * credited to one — and pretending otherwise by silently picking the first of
 * many would sync some devices and quietly strand the rest.
 */

/** One channel per scope and purpose, named so both ends agree. */
const labelFor = (options: { accessScopeId: string; channelId: string }): string =>
  `${options.accessScopeId}/${options.channelId}`;

export const createPeerChannelFactory = (
  registry: PeerSessionRegistry = peerSessions,
): PeerChannelFactory => ({
  open: async (options): Promise<DataChannelLike> => {
    const peer = await registry.next();
    return peer.session.openChannel(labelFor(options));
  },
});
