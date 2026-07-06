import { describe, it, expect, afterEach } from 'vitest';
import { createWebSocketRelaySocket, type RelayStatus, type ServerMessage } from './relayClient';

type Listener = (event: Event) => void;

// A minimal WebSocket stand-in: records sends and lets the test drive lifecycle
// events, so the client's buffering, status and parsing can be exercised without
// a real socket.
class FakeWebSocket {
  static last: FakeWebSocket | null = null;
  readonly sent: string[] = [];
  private readonly handlers = new Map<string, Set<Listener>>();

  constructor(readonly url: string) {
    FakeWebSocket.last = this;
  }

  addEventListener(type: string, listener: Listener): void {
    const set = this.handlers.get(type) ?? new Set<Listener>();
    set.add(listener);
    this.handlers.set(type, set);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.dispatch('close', new Event('close'));
  }

  dispatch(type: string, event: Event): void {
    for (const listener of this.handlers.get(type) ?? []) listener(event);
  }
}

const original = globalThis.WebSocket;

afterEach(() => {
  globalThis.WebSocket = original;
  FakeWebSocket.last = null;
});

const install = (): void => {
  globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
};

const fake = (): FakeWebSocket => {
  if (!FakeWebSocket.last) throw new Error('no socket constructed');
  return FakeWebSocket.last;
};

describe('createWebSocketRelaySocket', () => {
  it('buffers sends until the socket opens, then flushes in order', () => {
    install();
    const socket = createWebSocketRelaySocket('ws://relay');
    socket.send({ t: 'connect', roomId: 'r' });
    socket.send({ t: 'delete' });
    expect(fake().sent).toEqual([]);

    fake().dispatch('open', new Event('open'));
    expect(fake().sent).toEqual([
      JSON.stringify({ t: 'connect', roomId: 'r' }),
      JSON.stringify({ t: 'delete' }),
    ]);
  });

  it('sends straight through once open', () => {
    install();
    const socket = createWebSocketRelaySocket('ws://relay');
    fake().dispatch('open', new Event('open'));
    socket.send({ t: 'supersede', upto: 3 });
    expect(fake().sent).toEqual([JSON.stringify({ t: 'supersede', upto: 3 })]);
  });

  it('surfaces the connection lifecycle as status events', () => {
    install();
    const socket = createWebSocketRelaySocket('ws://relay');
    const statuses: RelayStatus[] = [];
    socket.onStatus((status) => statuses.push(status));
    expect(statuses).toEqual(['connecting']);

    fake().dispatch('open', new Event('open'));
    fake().dispatch('error', new Event('error'));
    fake().dispatch('close', new Event('close'));
    expect(statuses).toEqual(['connecting', 'online', 'error', 'offline']);
  });

  it('parses inbound messages and delivers them to listeners', () => {
    install();
    const socket = createWebSocketRelaySocket('ws://relay');
    const received: ServerMessage[] = [];
    socket.onMessage((message) => received.push(message));
    const event = new MessageEvent('message', { data: JSON.stringify({ t: 'ack', seq: 7 }) });
    fake().dispatch('message', event);
    expect(received).toEqual([{ t: 'ack', seq: 7 }]);
  });

  it('stops delivering to an unsubscribed listener', () => {
    install();
    const socket = createWebSocketRelaySocket('ws://relay');
    const received: ServerMessage[] = [];
    const unsubscribe = socket.onMessage((message) => received.push(message));
    unsubscribe();
    fake().dispatch('message', new MessageEvent('message', { data: JSON.stringify({ t: 'ack' }) }));
    expect(received).toEqual([]);
  });
});
