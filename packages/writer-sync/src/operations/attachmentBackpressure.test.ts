import { describe, expect, it } from 'vitest';
import {
  BUFFER_HIGH_WATER_BYTES,
  MAX_OUTBOX_MESSAGES,
  TransportBackpressureError,
  createWebRtcTransport,
  type DataChannelLike,
} from '../providers/webrtc/webRtcTransport';
import { buildChunkManifest } from './attachmentChunking';
import type { AttachmentChunkManifest } from './operation.types';
import {
  MAX_OFFERS_PER_PAGE,
  createAttachmentTransfer,
  type AttachmentTransfer,
} from './attachmentTransfer';
import { decodeCatchUpMessage, encodeCatchUpMessage, type CatchUpMessage } from './catchUpMessage';

/**
 * A transfer against a real transport, with the channel too full to take
 * anything — which is the state a large attachment puts it in almost at once.
 *
 * The unit tests either side of this one drive the protocol with a `send` that
 * always succeeds, so neither could see the failure this pair exists to prevent:
 * a request of 256 chunks is legal, and answering it in one pass overruns the
 * outbox and fails a session neither peer misused.
 *
 * One of these runs both ends over a real transport and takes an 800-chunk
 * attachment all the way to assembly. Pacing that only one side can see is a
 * claim about the sender; a file that arrives whole is the claim worth making.
 */

const CHUNK = 64;

const contentOf = (length: number): Uint8Array =>
  Uint8Array.from({ length }, (_unused, index) => index % 251);

/**
 * A channel that takes one message per drain, the way a slow link behaves: it
 * goes over its high-water mark on every write and comes back only when told.
 */
const trickleChannel = () => {
  const listeners = new Map<string, ((event: MessageEvent<unknown>) => void)[]>();
  const sent: CatchUpMessage[] = [];
  const channel = {
    label: 'writer-sync-control',
    readyState: 'open',
    bufferedAmount: BUFFER_HIGH_WATER_BYTES,
    bufferedAmountLowThreshold: 0,
    send: (data: ArrayBuffer) => {
      sent.push(decodeCatchUpMessage(new Uint8Array(data)));
      channel.bufferedAmount = BUFFER_HIGH_WATER_BYTES;
    },
    close: () => undefined,
    addEventListener: (type: string, listener: (event: MessageEvent<unknown>) => void) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
    removeEventListener: (
      type: string,
      listener: (event: MessageEvent<unknown>) => void,
    ) => {
      listeners.set(
        type,
        (listeners.get(type) ?? []).filter((held) => held !== listener),
      );
    },
  };
  return {
    sent,
    channel: channel as unknown as DataChannelLike,
    /** Report room, the way `bufferedamountlow` does when the link drains. */
    drain: () => {
      channel.bufferedAmount = 0;
      for (const listener of listeners.get('bufferedamountlow') ?? []) {
        listener({} as MessageEvent<unknown>);
      }
    },
  };
};

/** Let the holder work while the channel keeps draining under it. */
const runWhileDraining = async (
  wire: ReturnType<typeof trickleChannel>,
  work: Promise<void>,
): Promise<void> => {
  let done = false;
  void work.then(() => {
    done = true;
  });
  // Each turn: hand the sender room, then let its continuation run.
  for (let turn = 0; turn < 5_000 && !done; turn += 1) {
    wire.drain();
    await Promise.resolve();
  }
  await work;
};

/**
 * Two trickle channels wired to each other, so both ends run a real transport.
 *
 * One end held against a test double proves pacing; it cannot prove the file
 * arrives. Only a peer that is itself rate-limited, itself bounded by an outbox
 * and itself assembling from what crossed can say that.
 */
const linkedTrickle = () => {
  type ChannelListeners = Map<string, ((event: MessageEvent<unknown>) => void)[]>;
  const listeners: ChannelListeners[] = [
    new Map<string, ((event: MessageEvent<unknown>) => void)[]>(),
    new Map<string, ((event: MessageEvent<unknown>) => void)[]>(),
  ];
  const end = (self: number, peer: number) => {
    const channel = {
      label: 'writer-sync-control',
      readyState: 'open',
      bufferedAmount: BUFFER_HIGH_WATER_BYTES,
      bufferedAmountLowThreshold: 0,
      send: (data: ArrayBuffer) => {
        channel.bufferedAmount = BUFFER_HIGH_WATER_BYTES;
        const copy = new Uint8Array(data.byteLength);
        copy.set(new Uint8Array(data));
        for (const listener of [...(listeners[peer].get('message') ?? [])]) {
          listener({ data: copy.buffer } as MessageEvent<unknown>);
        }
      },
      close: () => undefined,
      addEventListener: (type: string, listener: (event: MessageEvent<unknown>) => void) => {
        listeners[self].set(type, [...(listeners[self].get(type) ?? []), listener]);
      },
      removeEventListener: (
        type: string,
        listener: (event: MessageEvent<unknown>) => void,
      ) => {
        listeners[self].set(
          type,
          (listeners[self].get(type) ?? []).filter((held) => held !== listener),
        );
      },
    };
    return {
      channel: channel as unknown as DataChannelLike,
      drain: () => {
        channel.bufferedAmount = 0;
        for (const listener of listeners[self].get('bufferedamountlow') ?? []) {
          listener({} as MessageEvent<unknown>);
        }
      },
    };
  };
  const ends = [end(0, 1), end(1, 0)];
  return {
    ends,
    drain: () => {
      for (const one of ends) one.drain();
    },
  };
};

const holderOver = (options: {
  transport: ReturnType<typeof createWebRtcTransport>;
  content: Uint8Array;
  manifest: AttachmentChunkManifest;
}): AttachmentTransfer =>
  createAttachmentTransfer({
    send: (message) => {
      options.transport.send(encodeCatchUpMessage(message));
    },
    sendWhenReady: async (message) => {
      await options.transport.sendWhenReady?.(encodeCatchUpMessage(message));
    },
    heldChunkIndices: async () => new Set<number>(),
    readChunk: async ({ index }) =>
      options.content.subarray(index * CHUNK, (index + 1) * CHUNK),
    saveAttachment: async () => undefined,
  });

describe('serving an attachment over a channel that is full', () => {
  it('answers a full page of chunks without overrunning the outbox', async () => {
    const chunkCount = 800;
    const content = contentOf(chunkCount * CHUNK);
    const manifest = await buildChunkManifest({
      attachmentId: 'a1',
      content,
      chunkBytes: CHUNK,
    });
    const wire = trickleChannel();
    const transport = createWebRtcTransport(wire.channel);
    const holder = holderOver({ transport, content, manifest });

    // The largest request the protocol allows, against a channel that takes one
    // message at a time. Without pacing, the outbox refuses partway through.
    await runWhileDraining(
      wire,
      holder.receive({
        v: 1,
        kind: 'attachment-request',
        attachmentId: 'a1',
        indices: Array.from({ length: 256 }, (_unused, index) => index),
      }),
    );

    const chunks = wire.sent.filter((message) => message.kind === 'attachment-chunk');
    expect(chunks).toHaveLength(256);
    // Every one of them crossed, and the session is still open to carry more.
    expect(() =>
      transport.send(
        encodeCatchUpMessage({ v: 1, kind: 'manifest', manifests: [] }),
      ),
    ).not.toThrow();
  });

  it('would overrun the outbox without waiting for the bearer', async () => {
    const content = contentOf(600 * CHUNK);
    const wire = trickleChannel();
    const transport = createWebRtcTransport(wire.channel);
    // The same work with the unpaced send — what this module did before.
    const holder = createAttachmentTransfer({
      send: (message) => {
        transport.send(encodeCatchUpMessage(message));
      },
      heldChunkIndices: async () => new Set<number>(),
      readChunk: async ({ index }) => content.subarray(index * CHUNK, (index + 1) * CHUNK),
      saveAttachment: async () => undefined,
    });

    await expect(
      holder.receive({
        v: 1,
        kind: 'attachment-request',
        attachmentId: 'a1',
        indices: Array.from({ length: MAX_OUTBOX_MESSAGES + 8 }, (_unused, i) => i),
      }),
    ).rejects.toBeInstanceOf(TransportBackpressureError);
  });
});

describe('a whole attachment between two transports', () => {
  it('assembles 800 chunks without either session closing', async () => {
    const chunkCount = 800;
    const content = contentOf(chunkCount * CHUNK);
    const manifest = await buildChunkManifest({
      attachmentId: 'a1',
      content,
      chunkBytes: CHUNK,
    });
    const link = linkedTrickle();
    // A clock that moves as the transfer does. The inbound budget is a rate,
    // and 800 chunks over a link that takes one message at a time is minutes of
    // it — a test that ran them all in the same millisecond would be refused
    // for flooding, which is not what a large attachment does.
    let millis = 0;
    const now = (): number => millis;
    const transports = link.ends.map((one) => createWebRtcTransport(one.channel, { now }));
    const [holderTransport, receiverTransport] = transports;

    const failures: unknown[] = [];
    for (const transport of transports) {
      transport.onClosed?.((reason) => {
        failures.push(reason ?? new Error('the session closed'));
      });
    }

    const holder = holderOver({ transport: holderTransport, content, manifest });
    const saved: Uint8Array[] = [];
    const receiver = createAttachmentTransfer({
      send: (message) => {
        receiverTransport.send(encodeCatchUpMessage(message));
      },
      sendWhenReady: async (message) => {
        await receiverTransport.sendWhenReady?.(encodeCatchUpMessage(message));
      },
      heldChunkIndices: async () => new Set<number>(),
      readChunk: async () => undefined,
      saveAttachment: async ({ content: assembled }) => {
        saved.push(assembled);
      },
    });

    const drive = (transfer: AttachmentTransfer) => (bytes: Uint8Array) => {
      void transfer.receive(decodeCatchUpMessage(bytes)).catch((reason: unknown) => {
        failures.push(reason);
      });
    };
    holderTransport.onMessage(drive(holder));
    receiverTransport.onMessage(drive(receiver));

    holder.offer([manifest]);

    for (let turn = 0; turn < 2_000; turn += 1) {
      if (saved.length > 0 || failures.length > 0) break;
      // A burst of link time, then a turn of the event loop: the receiver
      // verifies every chunk against real SHA-256, which no amount of draining
      // resolves on its own.
      for (let message = 0; message < 64; message += 1) {
        millis += 4;
        link.drain();
        await Promise.resolve();
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    expect(failures).toEqual([]);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toEqual(content);
    // Backpressure paced the transfer; it never ended the session.
    expect(() =>
      holderTransport.send(encodeCatchUpMessage({ v: 1, kind: 'manifest', manifests: [] })),
    ).not.toThrow();
  });
});

describe('offering a catalogue over a channel that is full', () => {
  it('walks 600 manifests without asking the receiver for more than it takes', async () => {
    const manifests = await Promise.all(
      Array.from({ length: 600 }, (_unused, index) =>
        buildChunkManifest({
          attachmentId: `a${String(index)}`,
          content: contentOf(CHUNK),
          chunkBytes: CHUNK,
        }),
      ),
    );
    const wire = trickleChannel();
    const transport = createWebRtcTransport(wire.channel);
    const holder = createAttachmentTransfer({
      send: (message) => {
        transport.send(encodeCatchUpMessage(message));
      },
      heldChunkIndices: async () => new Set<number>(),
      readChunk: async () => undefined,
      saveAttachment: async () => undefined,
    });

    holder.offer(manifests);
    wire.drain();

    // Every page is one the receiver could take whole, and the catalogue is
    // walked by demand rather than pushed at it.
    const offers = () =>
      wire.sent.filter(
        (message): message is Extract<CatchUpMessage, { kind: 'attachment-offer' }> =>
          message.kind === 'attachment-offer',
      );
    expect(offers()).toHaveLength(1);

    for (let page = 0; page < 600 / MAX_OFFERS_PER_PAGE; page += 1) {
      const last = offers().at(-1);
      if (last === undefined) break;
      await holder.receive({
        v: 1,
        kind: 'attachment-offer-next',
        cursor: last.cursor + last.manifests.length,
      });
      wire.drain();
    }

    const offered = offers().flatMap((offer) =>
      offer.manifests.map((one) => one.attachmentId),
    );
    expect(new Set(offered).size).toBe(600);
    expect(offers().every((offer) => offer.manifests.length <= MAX_OFFERS_PER_PAGE)).toBe(
      true,
    );
    // The session carried the whole catalogue and is still open.
    expect(() =>
      transport.send(
        encodeCatchUpMessage({ v: 1, kind: 'manifest', manifests: [] }),
      ),
    ).not.toThrow();
  });
});
