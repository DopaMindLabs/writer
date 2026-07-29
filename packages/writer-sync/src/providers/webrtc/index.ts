/**
 * The WebRTC transport for Writer Sync.
 *
 * Everything the browser supplies sits behind an injectable factory, so this
 * layer is testable without WebRTC — and so a native host can substitute its
 * own connection. Those tests prove orchestration only; real ICE, real
 * networks and real devices are slice 2A.9.
 */

export { CONTROL_CHANNEL } from './peerSession';
export {
  BUFFER_HIGH_WATER_BYTES,
  FrameTooLargeError,
  MAX_FRAME_BYTES,
  createWebRtcTransport,
} from './webRtcTransport';
export type { DataChannelLike } from './webRtcTransport';

export { MAX_HELD_MESSAGES, filterChannelByKind } from './filterChannelByKind';
export type { FilterChannelByKindOptions } from './filterChannelByKind';

export { splitPairingChannel } from './pairingChannelSplit';
export type {
  PairingChannelProtocol,
  PairingChannelViews,
  SplitPairingChannelOptions,
} from './pairingChannelSplit';

export {
  ICE_GATHERING_TIMEOUT_MILLIS,
  LOCAL_ONLY_ICE_CONFIGURATION,
  createPeerSession,
} from './peerSession';
export type {
  PeerConnectionLike,
  PeerSession,
  PeerSessionOptions,
  SessionDescriptionLike,
} from './peerSession';

export { createReconnectPolicy } from './reconnectPolicy';
export type { ReconnectPolicy, ReconnectPolicyOptions } from './reconnectPolicy';

export { createWebRtcSyncProvider } from './webRtcSyncProvider';
export type {
  PeerChannelFactory,
  WebRtcSyncProvider,
  WebRtcSyncProviderOptions,
} from './webRtcSyncProvider';
