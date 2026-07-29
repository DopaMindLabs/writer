import {
  SyncPhase,
  type SyncObservable,
  type SyncProvider,
  type SyncStatus,
  type SyncSubscription,
} from '../../core/providers.types';
import type { SyncTransport } from '../../core/transport.types';
import { createWebRtcTransport, type DataChannelLike } from './webRtcTransport';

/**
 * The peer-to-peer {@link SyncProvider}, per runbook §23.
 *
 * What it deliberately does **not** offer is as much of the design as what it
 * does. There is no `accessControl`: membership and permissions need a
 * server-side authority, and a provider with none would have to invent answers.
 * There is no `keyDelivery` either — a peer holds no key escrow;
 * key material reaches a device through pairing, which is a different mechanism
 * with a different threat model. Omitting a capability is how a provider says
 * "ask someone else", and `hasCapability` lets callers branch on that honestly
 * rather than on a stub that throws.
 */

/** A minimal observable, so the provider needs no reactive dependency. */
const createObservable = <T>(initial: T) => {
  const listeners = new Set<(value: T) => void>();
  let current = initial;
  return {
    observable: {
      subscribe: (next: (value: T) => void): SyncSubscription => {
        listeners.add(next);
        next(current);
        return {
          unsubscribe: () => {
            listeners.delete(next);
          },
        };
      },
    } satisfies SyncObservable<T>,
    set: (value: T) => {
      current = value;
      for (const listener of listeners) listener(value);
    },
    get: () => current,
  };
};

export interface PeerChannelFactory {
  /**
   * Open a channel for one scope and logical channel. Multiplexing by
   * `(accessScopeId, channelId)` is the caller's contract: one peer session
   * carries many logical channels rather than one connection per document.
   */
  open: (options: { accessScopeId: string; channelId: string }) => Promise<DataChannelLike>;
}

export interface WebRtcSyncProviderOptions {
  id: string;
  openChannel: PeerChannelFactory;
}

export interface WebRtcSyncProvider extends SyncProvider {
  /** Provider-specific status, distinct from the capability contracts. */
  status: SyncObservable<SyncStatus>;
  /** Report the peer session's connection state. */
  reportPhase: (phase: SyncPhase, error?: Error) => void;
  /** Close every transport this provider handed out. */
  closeAll: () => void;
}

export const createWebRtcSyncProvider = (
  options: WebRtcSyncProviderOptions,
): WebRtcSyncProvider => {
  const status = createObservable<SyncStatus>({ phase: SyncPhase.Initial });
  const transports = new Set<SyncTransport>();

  return {
    id: options.id,
    kind: 'webrtc',

    // Live transport is the capability this provider exists to offer. Created
    // per scope and channel rather than at session boot, so opening a document
    // does not depend on having booted a provider-wide connection.
    realtime: {
      createTransport: async ({ accessScopeId, channelId }) => {
        const channel = await options.openChannel.open({ accessScopeId, channelId });
        const transport = createWebRtcTransport(channel);
        // The closure notice travels with the transport: it is how a consumer
        // holding one per scope learns to stop using a bearer that is gone.
        const tracked: SyncTransport = {
          sharesStore: transport.sharesStore,
          send: transport.send,
          onMessage: transport.onMessage,
          onClosed: transport.onClosed,
          close: () => {
            transports.delete(tracked);
            transport.close();
          },
        };
        transports.add(tracked);
        return tracked;
      },
    },

    // `accessControl` and `keyDelivery` are intentionally absent — see above.

    status: status.observable,
    reportPhase: (phase, error) => {
      status.set(error === undefined ? { phase } : { phase, error });
    },
    closeAll: () => {
      for (const transport of [...transports]) transport.close();
    },
  };
};
