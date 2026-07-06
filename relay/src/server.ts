/**
 * The WebSocket transport in front of {@link ./core}. Each connection joins one
 * room, optionally presents a best-effort write token, resumes from a sequence
 * number, then posts and receives opaque blobs. The server merges nothing and
 * reads nothing — it relays ciphertext it cannot decrypt. Real authorisation is
 * the clients' signature checks; the write token (when a room secret is set) is
 * only a spam gate.
 */
import { WebSocketServer, type WebSocket } from 'ws';
import { createRelayCore, type Delivery, type Subscriber } from './core.ts';
import { deriveRoomWriteToken } from './roomToken.ts';
import type { RelayBlob, StoredBlob } from './protocol.ts';

interface ConnectMsg {
  t: 'connect';
  roomId: string;
  token?: string;
  resumeFrom?: number;
}
interface PostMsg {
  t: 'post';
  blob: RelayBlob;
}
interface SupersedeMsg {
  t: 'supersede';
  upto: number;
}
interface DeleteMsg {
  t: 'delete';
}
type ClientMsg = ConnectMsg | PostMsg | SupersedeMsg | DeleteMsg;

type ServerMsg =
  | { t: 'blob'; blob: StoredBlob }
  | { t: 'awareness'; payload: string }
  | { t: 'ack'; seq?: number }
  | { t: 'error'; error: string };

interface Session {
  roomId: string | null;
  authorised: boolean;
  subscriber: Subscriber | null;
  unsubscribe: (() => void) | null;
}

export interface RelayServerOptions {
  port?: number;
  host?: string;
  roomSecret?: string;
  maxBlobBytes?: number;
}

const send = (socket: WebSocket, message: ServerMsg): void => {
  socket.send(JSON.stringify(message));
};

const parse = (data: unknown): ClientMsg | null => {
  if (typeof data !== 'string') return null;
  try {
    return JSON.parse(data) as ClientMsg;
  } catch {
    return null;
  }
};

const deliveryToMessage = (delivery: Delivery): ServerMsg =>
  delivery.kind === 'blob'
    ? { t: 'blob', blob: delivery.blob }
    : { t: 'awareness', payload: delivery.payload };

/** Start a blind relay WebSocket server. Returns the underlying server. */
export const createRelayServer = (options: RelayServerOptions = {}): WebSocketServer => {
  const relay = createRelayCore({ maxBlobBytes: options.maxBlobBytes });
  const wss = new WebSocketServer({ port: options.port ?? 8787, host: options.host });

  const authorise = (roomId: string, token: string | undefined): boolean =>
    options.roomSecret === undefined || token === deriveRoomWriteToken(options.roomSecret, roomId);

  wss.on('connection', (socket: WebSocket) => {
    const session: Session = { roomId: null, authorised: false, subscriber: null, unsubscribe: null };

    const onConnect = (message: ConnectMsg): void => {
      session.roomId = message.roomId;
      session.authorised = authorise(message.roomId, message.token);
      const subscriber: Subscriber = (delivery) => {
        send(socket, deliveryToMessage(delivery));
      };
      session.subscriber = subscriber;
      session.unsubscribe = relay.subscribe(message.roomId, subscriber);
      for (const blob of relay.resume(message.roomId, message.resumeFrom ?? 0)) {
        send(socket, { t: 'blob', blob });
      }
      send(socket, { t: 'ack' });
    };

    const onWrite = (message: PostMsg | SupersedeMsg | DeleteMsg): void => {
      if (session.roomId === null || session.subscriber === null) {
        send(socket, { t: 'error', error: 'not connected' });
        return;
      }
      if (!session.authorised) {
        send(socket, { t: 'error', error: 'unauthorised' });
        return;
      }
      if (message.t === 'post') {
        const result = relay.post(session.roomId, message.blob, session.subscriber);
        send(socket, result.ok ? { t: 'ack', seq: result.kind === 'stored' ? result.seq : undefined } : { t: 'error', error: result.error });
        return;
      }
      if (message.t === 'supersede') {
        relay.supersede(session.roomId, message.upto);
      } else {
        relay.deleteRoom(session.roomId);
      }
      send(socket, { t: 'ack' });
    };

    socket.on('message', (data) => {
      const message = parse(String(data));
      if (message === null) {
        send(socket, { t: 'error', error: 'malformed message' });
        return;
      }
      if (message.t === 'connect') onConnect(message);
      else onWrite(message);
    });

    socket.on('close', () => {
      session.unsubscribe?.();
    });
  });

  return wss;
};
