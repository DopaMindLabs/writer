/**
 * A {@link SyncTransport} that carries Yjs sync and awareness messages over the
 * blind relay, **end-to-end encrypted**. It stacks beside
 * `BroadcastChannelTransport`: tabs stay locally synced while the relay carries
 * cross-user sync. Every outbound message is sealed (encrypted + signed) into a
 * frame; every inbound frame is verified against the current roster and decrypted
 * before its plaintext is handed to the provider, which applies it to the Y.Doc
 * with this transport as the (non-null) origin — so remote edits never enter the
 * local undo history (design §2.4).
 *
 * The transport merges nothing and re-broadcasts nothing: `send` posts local
 * messages only, and a frame that fails verification, comes from a non-member, or
 * is authored in a role that forbids its type (a reader's `update`) is **dropped**
 * — never delivered, never applied.
 */
import type { SyncTransport } from '@/lib/collab/types';
import {
  sealFrame,
  openFrame,
  FrameAuthError,
  FrameIntegrityError,
  type AuthorResolver,
  type FrameType,
} from '@/lib/collab/crypto/envelope';
import type { MemberKeys } from '@/lib/collab/crypto/memberKeys';
import { currentContentEpoch, type Roster } from '@/lib/collab/roster';
import { encodeEnvelope, decodeEnvelope } from './frameCodec';
import type { RelaySocket, RelayStatus, ServerMessage, SocketFactory } from './relayClient';

/** Mirrors the provider's leading message tag: `1` marks an awareness message. */
const MSG_AWARENESS = 1;
/** Frame types the transport hands to the provider (roster/key posts are routed elsewhere). */
const DOC_TYPES: ReadonlySet<FrameType> = new Set(['update', 'snapshot', 'awareness']);

/** Everything the transport needs from the room to seal, open and route frames. */
export interface RelayDeps {
  readonly socketFactory: SocketFactory;
  readonly roster: () => Roster;
  readonly keys: () => MemberKeys;
  readonly contentKey: () => CryptoKey;
  readonly resumeFrom?: () => number;
}

/** A relay transport plus its explicit connect and status surface (Stage 4 UI). */
export interface EncryptedRelayTransport extends SyncTransport {
  readonly connect: () => void;
  readonly onStatus: (cb: (status: RelayStatus) => void) => () => void;
}

const resolverFrom =
  (roster: Roster): AuthorResolver =>
  (authorId) => {
    const member = roster.members.find((entry) => entry.authorId === authorId);
    return member ? { pub: member, role: member.role } : null;
  };

const frameTypeOf = (bytes: Uint8Array): Extract<FrameType, 'update' | 'awareness'> =>
  bytes[0] === MSG_AWARENESS ? 'awareness' : 'update';

/** Verifies + decrypts inbound frames and tracks the highest seq applied. */
interface FrameRouter {
  readonly onServerMessage: (message: ServerMessage) => void;
  readonly lastSeq: () => number;
}

const createFrameRouter = (deps: RelayDeps, deliver: (bytes: Uint8Array) => void): FrameRouter => {
  let lastSeq = deps.resumeFrom?.() ?? 0;

  const handleFrame = async (payload: string, seq?: number): Promise<void> => {
    if (seq !== undefined) lastSeq = Math.max(lastSeq, seq);
    const env = decodeEnvelope(payload);
    if (!DOC_TYPES.has(env.type)) return; // roster / wrappedKey / join routed elsewhere (Task 10)
    try {
      const plain = await openFrame(deps.contentKey(), resolverFrom(deps.roster()), env);
      deliver(plain);
    } catch (error) {
      if (error instanceof FrameAuthError || error instanceof FrameIntegrityError) return; // drop
      throw error;
    }
  };

  const onServerMessage = (message: ServerMessage): void => {
    switch (message.t) {
      case 'blob':
        void handleFrame(message.blob.payload, message.blob.seq);
        return;
      case 'awareness':
        void handleFrame(message.payload);
        return;
      case 'ack':
      case 'error':
        return;
    }
  };

  return { onServerMessage, lastSeq: () => lastSeq };
};

/** A fan-out hub that buffers deliveries until the first listener attaches. */
interface ListenerHub {
  readonly deliver: (bytes: Uint8Array) => void;
  readonly onMessage: (cb: (bytes: Uint8Array) => void) => () => void;
  readonly clear: () => void;
}

const createListenerHub = (): ListenerHub => {
  const listeners = new Set<(bytes: Uint8Array) => void>();
  const pending: Uint8Array[] = [];
  return {
    deliver: (bytes) => {
      if (listeners.size === 0) {
        pending.push(bytes);
        return;
      }
      for (const listener of listeners) listener(bytes);
    },
    onMessage: (cb) => {
      listeners.add(cb);
      if (pending.length > 0) {
        for (const bytes of pending.splice(0)) cb(bytes);
      }
      return () => {
        listeners.delete(cb);
      };
    },
    clear: () => {
      listeners.clear();
    },
  };
};

export const createEncryptedRelayTransport = (
  roomId: string,
  relayUrl: string,
  deps: RelayDeps,
): EncryptedRelayTransport => {
  const hub = createListenerHub();
  const statusListeners = new Set<(status: RelayStatus) => void>();
  let socket: RelaySocket | null = null;
  const router = createFrameRouter(deps, hub.deliver);

  const sealAndPost = async (bytes: Uint8Array): Promise<void> => {
    const type = frameTypeOf(bytes);
    const env = await sealFrame(
      deps.contentKey(),
      deps.keys(),
      { roomId, type, epoch: currentContentEpoch(deps.roster()) },
      bytes,
    );
    socket?.send({ t: 'post', blob: { type, payload: encodeEnvelope(env) } });
  };

  const connect = (): void => {
    if (socket !== null) return;
    const opened = deps.socketFactory(relayUrl);
    socket = opened;
    opened.onMessage(router.onServerMessage);
    opened.onStatus((status) => {
      for (const listener of statusListeners) listener(status);
    });
    opened.send({ t: 'connect', roomId, resumeFrom: router.lastSeq() });
  };

  return {
    sharesStore: false,
    connect,
    send: (bytes) => {
      void sealAndPost(bytes);
    },
    onMessage: hub.onMessage,
    onStatus: (cb) => {
      statusListeners.add(cb);
      return () => {
        statusListeners.delete(cb);
      };
    },
    close: () => {
      socket?.close();
      socket = null;
      hub.clear();
    },
  };
};
