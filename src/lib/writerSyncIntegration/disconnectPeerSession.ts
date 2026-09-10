import type { DeviceId } from 'writer-sync/core';
import { peerSessions, type PeerSessionRegistry } from './peerSessionRegistry';

/**
 * Let go of the live connection to one device.
 *
 * Trust is stored, but a connection is held: revoking the record stops the next
 * session from being accepted and does nothing at all to the one already open.
 * A device removed while both are online would keep receiving frames and keep
 * answering catch-up until one of them reloaded — which is not what the person
 * who removed it was told would happen.
 *
 * Closing is safe to repeat and safe when nothing is connected: a device with no
 * registered session simply has nothing to let go of.
 */
export const disconnectPeerSession = (options: {
  deviceId: DeviceId;
  registry?: PeerSessionRegistry;
}): void => {
  const registry = options.registry ?? peerSessions;
  const going = registry
    .peers()
    .filter((peer) => String(peer.deviceId) === String(options.deviceId));
  for (const peer of going) {
    // Forgotten first, so nothing can be handed this session while it closes.
    registry.remove(peer.session);
    peer.session.close();
  }
};
