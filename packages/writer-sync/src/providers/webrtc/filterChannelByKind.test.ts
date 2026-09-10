import { describe, expect, it, vi } from 'vitest';
import {
  MAX_HELD_MESSAGES,
  filterChannelByKind,
  type DataChannelLike,
} from './index';

/** A scriptable stand-in for `RTCDataChannel`, so no WebRTC is involved. */
const fakeChannel = () => {
  const listeners = new Map<string, ((event: MessageEvent<unknown>) => void)[]>();
  const sent: ArrayBuffer[] = [];
  const channel: DataChannelLike & {
    sent: ArrayBuffer[];
    emit: (type: string, data?: unknown) => void;
    listenerCount: (type: string) => number;
    closed: boolean;
  } = {
    label: 'writer-sync-control',
    readyState: 'open',
    bufferedAmount: 0,
    bufferedAmountLowThreshold: 0,
    closed: false,
    sent,
    send: (data) => {
      sent.push(data);
    },
    close: () => {
      channel.closed = true;
    },
    addEventListener: (type, listener) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
    removeEventListener: (type, listener) => {
      listeners.set(
        type,
        (listeners.get(type) ?? []).filter((l) => l !== listener),
      );
    },
    emit: (type, data) => {
      for (const listener of [...(listeners.get(type) ?? [])]) {
        listener({ data } as MessageEvent<unknown>);
      }
    },
    listenerCount: (type) => (listeners.get(type) ?? []).length,
  };
  return channel;
};

/**
 * Encode into this realm's own ArrayBuffer. The encoder's `.buffer` belongs to
 * Node's realm under jsdom and fails the module's `instanceof` check — a real
 * channel would hand over a same-realm buffer, so the test builds one too.
 */
const bufferOf = (text: string): ArrayBuffer => {
  const encoded = new TextEncoder().encode(text);
  const buffer = new ArrayBuffer(encoded.byteLength);
  new Uint8Array(buffer).set(encoded);
  return buffer;
};

const messageOf = (kind: string): ArrayBuffer => bufferOf(JSON.stringify({ v: 1, kind }));

const kindOf = (data: unknown): string => {
  // A view forwards the event as it arrived, so this reads whatever the channel
  // was handed — bytes from a peer speaking the protocol, text from one that is not.
  const text =
    typeof data === 'string' ? data : new TextDecoder().decode(data as ArrayBuffer);
  const parsed: unknown = JSON.parse(text);
  return typeof parsed === 'object' && parsed !== null && 'kind' in parsed
    ? String((parsed as { kind: unknown }).kind)
    : '';
};

/** Collect what a view delivers, subscribing the way a transport does. */
const readKinds = (view: DataChannelLike): string[] => {
  const seen: string[] = [];
  view.addEventListener('message', (event) => {
    seen.push(kindOf(event.data));
  });
  return seen;
};

const accepting = (...kinds: string[]) => (kind: string | undefined) =>
  kind !== undefined && kinds.includes(kind);

describe('filterChannelByKind', () => {
  it('delivers a message whose kind the view is for', async () => {
    const channel = fakeChannel();
    const view = filterChannelByKind({ channel, accepts: accepting('manifest') });
    const seen = readKinds(view);
    await Promise.resolve();

    channel.emit('message', messageOf('manifest'));

    expect(seen).toEqual(['manifest']);
  });

  it('withholds a message belonging to the other protocol on the channel', async () => {
    const channel = fakeChannel();
    const view = filterChannelByKind({ channel, accepts: accepting('manifest') });
    const seen = readKinds(view);
    await Promise.resolve();

    channel.emit('message', messageOf('holds-root'));

    expect(seen).toEqual([]);
  });

  it('holds what arrives before its consumer subscribes, in order', async () => {
    // The whole point: a peer that starts syncing early is not refused and lost,
    // it waits. Nothing is attached to this view yet.
    const channel = fakeChannel();
    const view = filterChannelByKind({ channel, accepts: accepting('manifest', 'frames') });

    channel.emit('message', messageOf('manifest'));
    channel.emit('message', messageOf('frames'));
    const seen = readKinds(view);

    expect(seen).toEqual([]);
    await Promise.resolve();
    expect(seen).toEqual(['manifest', 'frames']);
  });

  it('holds nothing for a consumer that has subscribed and gone away', async () => {
    // A protocol that deliberately detaches — the root transfer, on settling —
    // is finished, not waiting. Its late repeats are not worth keeping.
    const channel = fakeChannel();
    const view = filterChannelByKind({ channel, accepts: accepting('ready') });
    const listener = vi.fn();
    view.addEventListener('message', listener);
    await Promise.resolve();
    view.removeEventListener('message', listener);

    channel.emit('message', messageOf('ready'));
    await Promise.resolve();

    expect(listener).not.toHaveBeenCalled();
  });

  it('holds a bounded number, dropping the oldest and saying so once', async () => {
    const channel = fakeChannel();
    const onOverflow = vi.fn();
    const view = filterChannelByKind({
      channel,
      accepts: accepting('frames'),
      onOverflow,
    });

    for (let index = 0; index <= MAX_HELD_MESSAGES + 1; index += 1) {
      channel.emit('message', messageOf('frames'));
    }
    const seen = readKinds(view);
    await Promise.resolve();

    expect(seen).toHaveLength(MAX_HELD_MESSAGES);
    // Loud about it, but a flooding peer cannot also flood the log.
    expect(onOverflow).toHaveBeenCalledTimes(1);
  });

  it('reads a kind from a buffer, a view over one, and text', async () => {
    const channel = fakeChannel();
    const view = filterChannelByKind({ channel, accepts: accepting('ack') });
    const seen = readKinds(view);
    await Promise.resolve();

    channel.emit('message', messageOf('ack'));
    channel.emit('message', new Uint8Array(messageOf('ack')));
    channel.emit('message', JSON.stringify({ v: 1, kind: 'ack' }));

    expect(seen).toEqual(['ack', 'ack', 'ack']);
  });

  it('reports no kind at all for bytes that are not a message', () => {
    // Deciding what to do with rubbish is the caller's: a view built to exclude
    // the other protocol lets it through, so a decoder refuses it out loud.
    const channel = fakeChannel();
    const kinds: (string | undefined)[] = [];
    const view = filterChannelByKind({
      channel,
      accepts: (kind) => {
        kinds.push(kind);
        return false;
      },
    });
    void view;

    channel.emit('message', bufferOf('not json'));
    channel.emit('message', bufferOf('{"v":1}'));
    channel.emit('message', bufferOf('{"v":1,"kind":7}'));
    channel.emit('message', 42);

    expect(kinds).toEqual([undefined, undefined, undefined, undefined]);
  });

  it('reads through to the channel it covers', () => {
    const channel = fakeChannel();
    channel.bufferedAmount = 17;
    const view = filterChannelByKind({ channel, accepts: () => true });

    expect(view.label).toBe('writer-sync-control');
    expect(view.readyState).toBe('open');
    expect(view.bufferedAmount).toBe(17);
  });

  it('sets the low-water threshold on the channel itself', () => {
    // A transport over this view configures backpressure on construction; the
    // real channel is what has to hear about it.
    const channel = fakeChannel();
    const view = filterChannelByKind({ channel, accepts: () => true });

    view.bufferedAmountLowThreshold = 512;

    expect(channel.bufferedAmountLowThreshold).toBe(512);
    expect(view.bufferedAmountLowThreshold).toBe(512);
  });

  it('sends and closes through to the channel', () => {
    const channel = fakeChannel();
    const view = filterChannelByKind({ channel, accepts: () => true });

    view.send(messageOf('manifest'));
    view.close();

    expect(channel.sent).toHaveLength(1);
    expect(channel.closed).toBe(true);
  });

  it('passes an event it does not route to the channel, and takes it back', () => {
    const channel = fakeChannel();
    const view = filterChannelByKind({ channel, accepts: () => true });
    const onLow = vi.fn();

    view.addEventListener('bufferedamountlow', onLow);
    channel.emit('bufferedamountlow');
    view.removeEventListener('bufferedamountlow', onLow);
    channel.emit('bufferedamountlow');

    expect(onLow).toHaveBeenCalledTimes(1);
  });

  it('gives two views over one channel only their own traffic', async () => {
    const channel = fakeChannel();
    const first = filterChannelByKind({ channel, accepts: accepting('manifest') });
    const second = filterChannelByKind({ channel, accepts: accepting('ready') });
    const toFirst = readKinds(first);
    const toSecond = readKinds(second);
    await Promise.resolve();

    channel.emit('message', messageOf('manifest'));
    channel.emit('message', messageOf('ready'));

    expect(toFirst).toEqual(['manifest']);
    expect(toSecond).toEqual(['ready']);
  });
});
