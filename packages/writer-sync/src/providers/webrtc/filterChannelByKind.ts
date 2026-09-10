import type { DataChannelLike } from './webRtcTransport';

/**
 * A view over one data channel carrying a single protocol's messages.
 *
 * Two protocols can share a channel — key material moves over the same wire that
 * syncs afterwards — and each has a decoder that refuses anything it does not
 * recognise. Taking turns is not enough to keep them apart: each device decides
 * when its turn ends from what it has heard, so a peer that starts the second
 * protocol early has its first message refused by a decoder still reading for the
 * first, and neither protocol retransmits it.
 *
 * A view answers the only question a router can ask without decoding — which
 * protocol does this message name — and holds what arrives before its consumer
 * is listening, so being early costs a wait rather than a message. What matches
 * no protocol is not filtered out: the caller's predicate decides, and the
 * predicates that split a channel by exclusion let rubbish reach both decoders,
 * where it is refused out loud.
 */

/**
 * How many messages a view holds for a consumer that has not subscribed yet.
 *
 * A handful of manifests is the real case. The bound is what stops a peer that
 * never stops talking from growing this without limit; past it the oldest goes,
 * because the newest is the one still worth answering.
 */
export const MAX_HELD_MESSAGES = 64;

export interface FilterChannelByKindOptions {
  channel: DataChannelLike;
  /**
   * Whether a message naming this kind belongs to this view. Called with nothing
   * when the bytes name no kind at all — not JSON, or JSON that is not a message.
   */
  accepts: (kind: string | undefined) => boolean;
  /** Told once, the first time held messages are dropped to stay within bounds. */
  onOverflow?: () => void;
}

type MessageListener = (event: MessageEvent<unknown>) => void;

/** A channel delivers whatever the browser gave it; these are bytes. */
const asBytes = (data: unknown): Uint8Array | null => {
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  if (typeof data === 'string') return new TextEncoder().encode(data);
  return null;
};

/**
 * The kind a message names, or nothing.
 *
 * Reads the envelope and no further: routing must cost no crypto and must never
 * throw on peer-supplied bytes. The version cannot be used to tell protocols
 * apart — they each number themselves from 1 — so the kind is all there is.
 */
const peekKind = (data: unknown): string | undefined => {
  const bytes = asBytes(data);
  if (bytes === null) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return undefined;
  }
  if (typeof parsed !== 'object' || parsed === null) return undefined;
  const { kind } = parsed as { kind?: unknown };
  return typeof kind === 'string' ? kind : undefined;
};

interface HoldBuffer {
  hold: (event: MessageEvent<unknown>) => void;
  drain: () => MessageEvent<unknown>[];
}

const createHoldBuffer = (onOverflow?: () => void): HoldBuffer => {
  const held: MessageEvent<unknown>[] = [];
  let overflowed = false;
  return {
    hold: (event) => {
      held.push(event);
      if (held.length <= MAX_HELD_MESSAGES) return;
      held.shift();
      if (overflowed) return;
      // Said once: a peer flooding the channel must not also flood the log.
      overflowed = true;
      onOverflow?.();
    },
    drain: () => held.splice(0, held.length),
  };
};

interface MessageRouting {
  addMessageListener: (listener: MessageListener) => void;
  removeMessageListener: (listener: MessageListener) => void;
}

/**
 * The channel underneath, with message delivery redirected.
 *
 * Every other event and every property reads through live rather than being
 * copied: a transport over this view configures backpressure on construction and
 * reads the buffered amount as it sends, and both belong to the real channel.
 */
const createChannelView = (
  channel: DataChannelLike,
  routing: MessageRouting,
): DataChannelLike => ({
  get label() {
    return channel.label;
  },
  get readyState() {
    return channel.readyState;
  },
  get bufferedAmount() {
    return channel.bufferedAmount;
  },
  set bufferedAmount(value: number) {
    channel.bufferedAmount = value;
  },
  get bufferedAmountLowThreshold() {
    return channel.bufferedAmountLowThreshold;
  },
  set bufferedAmountLowThreshold(value: number) {
    channel.bufferedAmountLowThreshold = value;
  },
  send: (data) => {
    channel.send(data);
  },
  close: () => {
    channel.close();
  },
  addEventListener: (type, listener) => {
    if (type !== 'message') {
      channel.addEventListener(type, listener);
      return;
    }
    routing.addMessageListener(listener);
  },
  removeEventListener: (type, listener) => {
    if (type !== 'message') {
      channel.removeEventListener(type, listener);
      return;
    }
    routing.removeMessageListener(listener);
  },
});

export const filterChannelByKind = (
  options: FilterChannelByKindOptions,
): DataChannelLike => {
  const { channel, accepts, onOverflow } = options;
  const listeners = new Set<MessageListener>();
  const holding = createHoldBuffer(onOverflow);
  let taken = false;

  const deliver = (event: MessageEvent<unknown>): void => {
    for (const listener of [...listeners]) listener(event);
  };

  channel.addEventListener('message', (event) => {
    if (!accepts(peekKind(event.data))) return;
    if (taken) {
      deliver(event);
      return;
    }
    holding.hold(event);
  });

  return createChannelView(channel, {
    addMessageListener: (listener) => {
      listeners.add(listener);
      if (taken) return;
      taken = true;
      // Released on a microtask rather than here: a transport subscribes its own
      // listener after whatever constructed it, and a message delivered during
      // construction would arrive before anything was there to receive it.
      queueMicrotask(() => {
        for (const event of holding.drain()) deliver(event);
      });
    },
    removeMessageListener: (listener) => {
      // Nothing is held for a consumer that has been and gone: a protocol that
      // detaches has finished, and its peer's late repeats are not worth keeping.
      listeners.delete(listener);
    },
  });
};
