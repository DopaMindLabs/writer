import { invariant } from '@/lib/invariant';
import {
  LOCAL_ONLY_ICE_CONFIGURATION,
  type PeerConnectionLike,
  type SessionDescriptionLike,
} from 'writer-sync/providers/webrtc';

/**
 * The browser's `RTCPeerConnection`, narrowed to the port the pairing engine
 * depends on.
 *
 * The engine cannot take `RTCPeerConnection` directly: its descriptions carry an
 * *optional* `sdp`, while a pairing payload must carry a complete one. Normalising
 * that here means the absence shows up as an empty description at the boundary
 * rather than as `undefined` halfway through signing a payload.
 *
 * No ICE servers are configured. Stage 2A pairs two devices on the same network
 * and must not silently reach a public STUN server to do it (runbook §21).
 */

const SDP_TYPES = ['offer', 'answer', 'pranswer', 'rollback'] as const;

const asDescription = (
  description: RTCSessionDescriptionInit,
): SessionDescriptionLike => ({
  type: description.type,
  sdp: description.sdp ?? '',
});

/**
 * The port carries `type` as a plain string, because the engine has no opinion
 * about WebRTC's vocabulary. Crossing back into the browser it has to be one of
 * the four the API accepts, and anything else is a bug rather than something to
 * coerce.
 */
const asInit = (description: SessionDescriptionLike): RTCSessionDescriptionInit => {
  const type = SDP_TYPES.find((candidate) => candidate === description.type);
  invariant(type !== undefined, 'peer connection: unsupported session description type');
  return { type, sdp: description.sdp };
};

export const createBrowserPeerConnection = (): PeerConnectionLike => {
  const connection = new RTCPeerConnection({
    iceServers: [...LOCAL_ONLY_ICE_CONFIGURATION.iceServers],
  });

  return {
    get iceGatheringState() {
      return connection.iceGatheringState;
    },
    get connectionState() {
      return connection.connectionState;
    },
    get localDescription() {
      return connection.localDescription === null
        ? null
        : asDescription(connection.localDescription);
    },
    createDataChannel: (label, options) => connection.createDataChannel(label, options),
    createOffer: async () => asDescription(await connection.createOffer()),
    createAnswer: async () => asDescription(await connection.createAnswer()),
    setLocalDescription: (description) => connection.setLocalDescription(asInit(description)),
    setRemoteDescription: (description) => connection.setRemoteDescription(asInit(description)),
    close: () => {
      connection.close();
    },
    addEventListener: (type, listener) => {
      connection.addEventListener(type, listener);
    },
    removeEventListener: (type, listener) => {
      connection.removeEventListener(type, listener);
    },
  };
};
