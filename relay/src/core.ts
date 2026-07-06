/**
 * The relay core: an in-memory, transport-agnostic blind store-and-forward log.
 * It knows nothing of crypto, identity or documents — it appends opaque blobs to
 * per-room logs, hands each a monotonic `seq`, fans blobs out to subscribers, and
 * lets clients resume from a sequence number. Awareness frames are forwarded but
 * never stored. Authorisation is the *client's* job (signatures verified against
 * the roster); the relay's only guards are shape and size, so a peer cannot wedge
 * it with a malformed or oversized frame.
 *
 * Kept free of any socket dependency so the whole protocol is unit-testable; the
 * {@link ./server} module wires this to a WebSocket transport.
 */
import { STORED_BLOB_TYPES, type BlobType, type RelayBlob, type StoredBlob } from './protocol.ts';

/** What a subscriber receives: a stored blob (with seq) or an ephemeral awareness frame. */
export type Delivery =
  | { kind: 'blob'; blob: StoredBlob }
  | { kind: 'awareness'; payload: string };

export type Subscriber = (delivery: Delivery) => void;

/** The outcome of posting a blob to a room. */
export type PostResult =
  | { ok: true; kind: 'stored'; seq: number }
  | { ok: true; kind: 'forwarded' }
  | { ok: false; error: 'oversized' | 'malformed' };

export interface RelayCoreOptions {
  maxBlobBytes?: number;
}

interface Room {
  seq: number;
  log: StoredBlob[];
  subscribers: Set<Subscriber>;
}

const DEFAULT_MAX_BLOB_BYTES = 1_000_000;
const BLOB_TYPES = new Set<string>([...STORED_BLOB_TYPES, 'awareness']);
const encoder = new TextEncoder();

const isValidBlob = (blob: unknown): blob is RelayBlob => {
  if (typeof blob !== 'object' || blob === null) return false;
  const candidate = blob as Record<string, unknown>;
  return (
    typeof candidate.type === 'string' &&
    BLOB_TYPES.has(candidate.type) &&
    typeof candidate.payload === 'string'
  );
};

export const createRelayCore = (options: RelayCoreOptions = {}) => {
  const maxBlobBytes = options.maxBlobBytes ?? DEFAULT_MAX_BLOB_BYTES;
  const rooms = new Map<string, Room>();

  const roomOf = (roomId: string): Room => {
    const existing = rooms.get(roomId);
    if (existing) return existing;
    const room: Room = { seq: 0, log: [], subscribers: new Set() };
    rooms.set(roomId, room);
    return room;
  };

  const notify = (room: Room, delivery: Delivery, origin?: Subscriber): void => {
    for (const subscriber of room.subscribers) {
      if (subscriber !== origin) subscriber(delivery);
    }
  };

  /** Post a blob to a room: store-and-fan-out, or forward-only for awareness. */
  const post = (roomId: string, blob: RelayBlob, origin?: Subscriber): PostResult => {
    if (!isValidBlob(blob)) return { ok: false, error: 'malformed' };
    if (encoder.encode(blob.payload).byteLength > maxBlobBytes) return { ok: false, error: 'oversized' };
    const room = roomOf(roomId);
    if (blob.type === 'awareness') {
      notify(room, { kind: 'awareness', payload: blob.payload }, origin);
      return { ok: true, kind: 'forwarded' };
    }
    room.seq += 1;
    const stored: StoredBlob = { seq: room.seq, type: blob.type as Exclude<BlobType, 'awareness'>, payload: blob.payload };
    room.log.push(stored);
    notify(room, { kind: 'blob', blob: stored }, origin);
    return { ok: true, kind: 'stored', seq: stored.seq };
  };

  /** Every stored blob with `seq` greater than `since`, in order. */
  const resume = (roomId: string, since: number): StoredBlob[] =>
    rooms.get(roomId)?.log.filter((blob) => blob.seq > since) ?? [];

  /** Subscribe to a room's live deliveries; returns an unsubscribe function. */
  const subscribe = (roomId: string, subscriber: Subscriber): (() => void) => {
    const room = roomOf(roomId);
    room.subscribers.add(subscriber);
    return () => {
      room.subscribers.delete(subscriber);
    };
  };

  /** Drop every stored blob with `seq` ≤ `upto`. Idempotent; `seq` keeps rising. */
  const supersede = (roomId: string, upto: number): void => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.log = room.log.filter((blob) => blob.seq > upto);
  };

  /** Best-effort hygiene: forget a room's log and subscribers entirely. */
  const deleteRoom = (roomId: string): void => {
    rooms.delete(roomId);
  };

  return { post, resume, subscribe, supersede, deleteRoom };
};

export type RelayCore = ReturnType<typeof createRelayCore>;
