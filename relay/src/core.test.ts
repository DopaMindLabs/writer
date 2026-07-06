import { describe, it, expect, vi } from 'vitest';
import { createRelayCore, type Delivery } from './core.ts';
import type { RelayBlob } from './protocol.ts';

const update = (payload: string): RelayBlob => ({ type: 'update', payload });

describe('relay core', () => {
  it('assigns increasing sequence numbers on append', () => {
    const relay = createRelayCore();
    const a = relay.post('room-1', update('a'));
    const b = relay.post('room-1', update('b'));
    expect(a).toEqual({ ok: true, kind: 'stored', seq: 1 });
    expect(b).toEqual({ ok: true, kind: 'stored', seq: 2 });
  });

  it('resumes only blobs after the given sequence number', () => {
    const relay = createRelayCore();
    relay.post('room-1', update('a'));
    relay.post('room-1', update('b'));
    relay.post('room-1', update('c'));
    expect(relay.resume('room-1', 1).map((b) => b.payload)).toEqual(['b', 'c']);
    expect(relay.resume('room-1', 3)).toEqual([]);
  });

  it('delivers a posted blob to a second subscriber', () => {
    const relay = createRelayCore();
    const received: Delivery[] = [];
    relay.subscribe('room-1', (d) => received.push(d));
    relay.post('room-1', update('hello'));
    expect(received).toEqual([{ kind: 'blob', blob: { seq: 1, type: 'update', payload: 'hello' } }]);
  });

  it('does not echo a blob back to its origin subscriber', () => {
    const relay = createRelayCore();
    const origin = vi.fn();
    const other = vi.fn();
    relay.subscribe('room-1', origin);
    relay.subscribe('room-1', other);
    relay.post('room-1', update('x'), origin);
    expect(origin).not.toHaveBeenCalled();
    expect(other).toHaveBeenCalledTimes(1);
  });

  it('forwards awareness live but never stores it (resume omits it)', () => {
    const relay = createRelayCore();
    const received: Delivery[] = [];
    relay.subscribe('room-1', (d) => received.push(d));
    const result = relay.post('room-1', { type: 'awareness', payload: 'cursor' });
    expect(result).toEqual({ ok: true, kind: 'forwarded' });
    expect(received).toEqual([{ kind: 'awareness', payload: 'cursor' }]);
    expect(relay.resume('room-1', 0)).toEqual([]);
  });

  it('supersede ≤ N drops earlier blobs and is idempotent', () => {
    const relay = createRelayCore();
    relay.post('room-1', update('a'));
    relay.post('room-1', update('b'));
    relay.post('room-1', update('c'));
    relay.supersede('room-1', 2);
    expect(relay.resume('room-1', 0).map((b) => b.seq)).toEqual([3]);
    relay.supersede('room-1', 2);
    expect(relay.resume('room-1', 0).map((b) => b.seq)).toEqual([3]);
    // seq keeps rising after compaction — the next append is 4, not a reuse.
    expect(relay.post('room-1', update('d'))).toEqual({ ok: true, kind: 'stored', seq: 4 });
  });

  it('delete-room clears the room', () => {
    const relay = createRelayCore();
    relay.post('room-1', update('a'));
    relay.deleteRoom('room-1');
    expect(relay.resume('room-1', 0)).toEqual([]);
  });

  it('rejects an oversized or malformed blob', () => {
    const relay = createRelayCore({ maxBlobBytes: 8 });
    expect(relay.post('room-1', update('too-many-bytes'))).toEqual({ ok: false, error: 'oversized' });
    expect(relay.post('room-1', { type: 'nope', payload: 'x' } as unknown as RelayBlob)).toEqual({
      ok: false,
      error: 'malformed',
    });
    expect(relay.post('room-1', { type: 'update', payload: 42 } as unknown as RelayBlob)).toEqual({
      ok: false,
      error: 'malformed',
    });
    expect(relay.resume('room-1', 0)).toEqual([]);
  });

  it('keeps two rooms isolated', () => {
    const relay = createRelayCore();
    const roomTwo: Delivery[] = [];
    relay.subscribe('room-2', (d) => roomTwo.push(d));
    relay.post('room-1', update('only-room-1'));
    expect(roomTwo).toEqual([]);
    expect(relay.resume('room-2', 0)).toEqual([]);
    expect(relay.resume('room-1', 0).map((b) => b.payload)).toEqual(['only-room-1']);
  });
});
