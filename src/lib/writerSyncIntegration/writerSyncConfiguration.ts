import type { SyncConfiguration } from 'writer-sync/core';
import { createWebRtcSyncProvider } from 'writer-sync/providers/webrtc';
import { createDexieCloudProvider } from '@/lib/cloud/dexieCloudProvider';
import { createPeerChannelFactory } from './peerChannelFactory';

/**
 * Writer's own sync configuration — the single place Writer names its providers
 * and defaults. The reusable engine chooses nothing; the application does.
 *
 * Both providers are named at boot. The peer provider holds no connection until
 * a pairing is confirmed, and asks for a channel only when something wants a live
 * transport, so naming it costs nothing on a device that has never paired —
 * whereas registering it later, once a peer appeared, would mean a coordinator
 * whose providers change under its callers.
 *
 * Dexie Cloud stays the default: it is the provider with durable session sync,
 * which is what boot starts and what frame ingestion follows. The peer provider
 * offers live transport and deliberately nothing else — no access control, no key
 * delivery, since a peer is no authority on either.
 */
/** Names the peer provider, so boot can find the one that carries live work. */
export const P2P_PROVIDER_ID = 'writer-p2p';

export const writerSyncConfiguration = (): SyncConfiguration => {
  const dexieCloud = createDexieCloudProvider();
  const peers = createWebRtcSyncProvider({
    id: P2P_PROVIDER_ID,
    openChannel: createPeerChannelFactory(),
  });
  return {
    providers: [dexieCloud, peers],
    bindings: [],
    defaultProviderInstanceId: dexieCloud.id,
    pairingMethods: [],
  };
};
