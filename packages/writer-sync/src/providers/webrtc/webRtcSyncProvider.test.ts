import { describe, expect, it, vi } from 'vitest';
import { SyncPhase, hasCapability } from '../../core/providers.types';
import type { SyncStatus } from '../../core/providers.types';
import { createWebRtcSyncProvider } from './webRtcSyncProvider';
import { MAX_FRAME_BYTES, type DataChannelLike } from './webRtcTransport';

const fakeChannel = (): DataChannelLike & { closed: boolean; die: () => void } => {
  const listeners = new Map<string, ((event: MessageEvent<unknown>) => void)[]>();
  const channel = {
    label: 'writer-sync-control',
    readyState: 'open',
    bufferedAmount: 0,
    bufferedAmountLowThreshold: 0,
    closed: false,
    send: vi.fn(),
    close: () => {
      channel.closed = true;
    },
    addEventListener: (type: string, listener: (event: MessageEvent<unknown>) => void) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
    removeEventListener: (type: string, listener: (event: MessageEvent<unknown>) => void) => {
      listeners.set(
        type,
        (listeners.get(type) ?? []).filter((held) => held !== listener),
      );
    },
    /** The connection drops, the way a real channel reports it. */
    die: () => {
      (channel as { readyState: string }).readyState = 'closed';
      for (const listener of [...(listeners.get('close') ?? [])]) {
        listener({} as MessageEvent<unknown>);
      }
    },
  };
  return channel;
};

const providerWith = (open = vi.fn(() => Promise.resolve(fakeChannel()))) => ({
  provider: createWebRtcSyncProvider({ id: 'peer-1', openChannel: { open } }),
  open,
});

describe('capabilities', () => {
  it('offers realtime transport', () => {
    const { provider } = providerWith();
    expect(hasCapability(provider, 'realtime')).toBe(true);
  });

  it('does not offer access control — it has no server-side authority', () => {
    // A provider with no authority would have to invent answers about
    // membership; omitting the capability says "ask someone else" honestly.
    const { provider } = providerWith();
    expect(hasCapability(provider, 'accessControl')).toBe(false);
  });

  it('does not offer key delivery — a peer holds no key escrow', () => {
    // Key material reaches a device through pairing, a different mechanism
    // with a different threat model.
    const { provider } = providerWith();
    expect(hasCapability(provider, 'keyDelivery')).toBe(false);
  });

  it('names its kind without claiming to be the only instance', () => {
    const { provider } = providerWith();
    expect(provider.kind).toBe('webrtc');
    expect(provider.id).toBe('peer-1');
  });

  it('allows two configured instances of the same kind', () => {
    const a = createWebRtcSyncProvider({
      id: 'peer-a',
      openChannel: { open: vi.fn(() => Promise.resolve(fakeChannel())) },
    });
    const b = createWebRtcSyncProvider({
      id: 'peer-b',
      openChannel: { open: vi.fn(() => Promise.resolve(fakeChannel())) },
    });
    expect(a.id).not.toBe(b.id);
    expect(a.kind).toBe(b.kind);
  });
});

describe('realtime transport', () => {
  it('opens a channel for the requested scope and channel id', async () => {
    const { provider, open } = providerWith();
    await provider.realtime?.createTransport({ accessScopeId: 'space-1', channelId: 'doc-1' });
    expect(open).toHaveBeenCalledWith({ accessScopeId: 'space-1', channelId: 'doc-1' });
  });

  it('multiplexes — one peer session carries many logical channels', async () => {
    const { provider, open } = providerWith();
    await provider.realtime?.createTransport({ accessScopeId: 'space-1', channelId: 'doc-1' });
    await provider.realtime?.createTransport({ accessScopeId: 'space-1', channelId: 'doc-2' });
    expect(open).toHaveBeenCalledTimes(2);
  });

  it('hands back a transport that does not share a store', async () => {
    const { provider } = providerWith();
    const transport = await provider.realtime?.createTransport({
      accessScopeId: 'space-1',
      channelId: 'doc-1',
    });
    expect(transport?.sharesStore).toBe(false);
  });

  it('carries the ceiling the bearer enforces, so senders can pack against it', async () => {
    // Left off, the consumer's ceiling check has no ceiling to check against and
    // passes everything — so an oversized frame reaches the channel and throws
    // there, instead of being skipped with its name in the log.
    const { provider } = providerWith();
    const transport = await provider.realtime?.createTransport({
      accessScopeId: 'space-1',
      channelId: 'doc-1',
    });
    expect(transport?.maxMessageBytes).toBe(MAX_FRAME_BYTES);
  });

  it('passes on the bearer going away, so a consumer can stop holding it', async () => {
    // The consumer keeps one transport per scope. If the provider swallows this,
    // it never learns the channel is gone and writes every later frame into it.
    const channel = fakeChannel();
    const { provider } = providerWith(vi.fn(() => Promise.resolve(channel)));
    const transport = await provider.realtime?.createTransport({
      accessScopeId: 'space-1',
      channelId: 'doc-1',
    });
    const onClosed = vi.fn();
    transport?.onClosed?.(onClosed);

    channel.die();

    expect(onClosed).toHaveBeenCalledTimes(1);
  });
});

describe('teardown', () => {
  it('closes every transport it handed out', async () => {
    const channels: (DataChannelLike & { closed: boolean })[] = [];
    const open = vi.fn(() => {
      const channel = fakeChannel();
      channels.push(channel);
      return Promise.resolve(channel);
    });
    const { provider } = providerWith(open);
    await provider.realtime?.createTransport({ accessScopeId: 's', channelId: 'a' });
    await provider.realtime?.createTransport({ accessScopeId: 's', channelId: 'b' });

    provider.closeAll();
    expect(channels.every((channel) => channel.closed)).toBe(true);
  });

  it('forgets a transport the caller closed, so teardown does not double-close', async () => {
    const { provider } = providerWith();
    const transport = await provider.realtime?.createTransport({
      accessScopeId: 's',
      channelId: 'a',
    });
    transport?.close();
    expect(() => provider.closeAll()).not.toThrow();
  });
});

describe('status', () => {
  it('starts in the initial phase', () => {
    const { provider } = providerWith();
    let seen: SyncStatus | null = null;
    provider.status.subscribe((status) => (seen = status));
    expect(seen).toEqual({ phase: SyncPhase.Initial });
  });

  it('reports phase changes to subscribers', () => {
    const { provider } = providerWith();
    const seen: SyncStatus[] = [];
    provider.status.subscribe((status) => seen.push(status));
    provider.reportPhase(SyncPhase.InSync);
    expect(seen.at(-1)).toEqual({ phase: SyncPhase.InSync });
  });

  it('carries the error when a round fails', () => {
    const { provider } = providerWith();
    const seen: SyncStatus[] = [];
    provider.status.subscribe((status) => seen.push(status));
    const error = new Error('peer went away');
    provider.reportPhase(SyncPhase.Error, error);
    expect(seen.at(-1)).toEqual({ phase: SyncPhase.Error, error });
  });

  it('stops reporting once unsubscribed', () => {
    const { provider } = providerWith();
    const seen: SyncStatus[] = [];
    provider.status.subscribe((status) => seen.push(status)).unsubscribe();
    provider.reportPhase(SyncPhase.Offline);
    expect(seen).toHaveLength(1);
  });
});
