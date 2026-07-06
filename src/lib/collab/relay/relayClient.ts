/**
 * The client side of the relay wire protocol, and a WebSocket implementation of
 * it. The socket is abstracted behind {@link RelaySocket} so the transport can be
 * driven by an in-memory relay in tests. The protocol mirrors the reference relay
 * package (`@lipsum/collab-relay`); it is duplicated here rather than imported
 * because the browser build must not depend on the server workspace.
 *
 * Every `payload` is opaque ciphertext to the relay — see {@link ./frameCodec}.
 */

/** Blob classes the relay persists in a room's append log. */
export type StoredBlobType = 'update' | 'snapshot' | 'roster' | 'wrappedKey' | 'join';
/** Every blob class, including the ephemeral (never-stored) awareness frame. */
export type BlobType = StoredBlobType | 'awareness';

export interface RelayBlob {
  type: BlobType;
  payload: string;
}

export interface StoredBlob {
  seq: number;
  type: StoredBlobType;
  payload: string;
}

export type ClientMessage =
  | { t: 'connect'; roomId: string; token?: string; resumeFrom?: number }
  | { t: 'post'; blob: RelayBlob }
  | { t: 'supersede'; upto: number }
  | { t: 'delete' };

export type ServerMessage =
  | { t: 'blob'; blob: StoredBlob }
  | { t: 'awareness'; payload: string }
  | { t: 'ack'; seq?: number }
  | { t: 'error'; error: string };

/** Connection lifecycle, surfaced for the Stage 4 presence UI. */
export type RelayStatus = 'connecting' | 'online' | 'offline' | 'error';

/** A transport-agnostic relay connection. */
export interface RelaySocket {
  readonly send: (message: ClientMessage) => void;
  readonly onMessage: (cb: (message: ServerMessage) => void) => () => void;
  readonly onStatus: (cb: (status: RelayStatus) => void) => () => void;
  readonly close: () => void;
}

export type SocketFactory = (url: string) => RelaySocket;

/** A WebSocket-backed {@link RelaySocket}; buffers sends until the socket opens. */
export const createWebSocketRelaySocket: SocketFactory = (url) => {
  const socket = new WebSocket(url);
  const messageListeners = new Set<(message: ServerMessage) => void>();
  const statusListeners = new Set<(status: RelayStatus) => void>();
  const outbox: ClientMessage[] = [];
  let open = false;
  let currentStatus: RelayStatus = 'connecting';

  const emitStatus = (status: RelayStatus): void => {
    currentStatus = status;
    for (const listener of statusListeners) listener(status);
  };

  const flush = (): void => {
    while (outbox.length > 0) {
      const next = outbox.shift();
      if (next) socket.send(JSON.stringify(next));
    }
  };

  emitStatus('connecting');
  socket.addEventListener('open', () => {
    open = true;
    emitStatus('online');
    flush();
  });
  socket.addEventListener('close', () => {
    open = false;
    emitStatus('offline');
  });
  socket.addEventListener('error', () => {
    emitStatus('error');
  });
  socket.addEventListener('message', (event: MessageEvent) => {
    const message = JSON.parse(String(event.data)) as ServerMessage;
    for (const listener of messageListeners) listener(message);
  });

  return {
    send: (message) => {
      if (open) socket.send(JSON.stringify(message));
      else outbox.push(message);
    },
    onMessage: (cb) => {
      messageListeners.add(cb);
      return () => messageListeners.delete(cb);
    },
    onStatus: (cb) => {
      statusListeners.add(cb);
      cb(currentStatus);
      return () => statusListeners.delete(cb);
    },
    close: () => {
      socket.close();
    },
  };
};
