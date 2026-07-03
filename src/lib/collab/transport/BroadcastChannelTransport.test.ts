import { describe, it, expect } from 'vitest';
import type { SyncTransport } from '@/lib/collab/types';
import { createBroadcastChannelTransport } from './BroadcastChannelTransport';

const settle = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 30));

const nextMessage = (transport: SyncTransport): Promise<Uint8Array> =>
  new Promise((resolve) => {
    const off = transport.onMessage((bytes) => {
      off();
      resolve(bytes);
    });
  });

describe('createBroadcastChannelTransport', () => {
  it('marks itself as sharing the local store', () => {
    const transport = createBroadcastChannelTransport('d-share');
    expect(transport.sharesStore).toBe(true);
    transport.close();
  });

  it('delivers a sent message to a peer on the same doc channel', async () => {
    const a = createBroadcastChannelTransport('d1');
    const b = createBroadcastChannelTransport('d1');
    const received = nextMessage(b);
    a.send(new Uint8Array([1, 2, 3]));
    expect(Array.from(await received)).toEqual([1, 2, 3]);
    a.close();
    b.close();
  });

  it('does not deliver across different doc channels', async () => {
    const a = createBroadcastChannelTransport('docA');
    const b = createBroadcastChannelTransport('docB');
    let delivered = false;
    const off = b.onMessage(() => {
      delivered = true;
    });
    a.send(new Uint8Array([9]));
    await settle();
    expect(delivered).toBe(false);
    off();
    a.close();
    b.close();
  });

  it('stops delivering after the returned unsubscribe is called', async () => {
    const a = createBroadcastChannelTransport('d2');
    const b = createBroadcastChannelTransport('d2');
    let count = 0;
    const off = b.onMessage(() => {
      count += 1;
    });
    a.send(new Uint8Array([1]));
    await settle();
    off();
    a.send(new Uint8Array([2]));
    await settle();
    expect(count).toBe(1);
    a.close();
    b.close();
  });
});
