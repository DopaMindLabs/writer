import { describe, expect, it, vi } from 'vitest';
import { asDeviceId } from 'writer-sync/core';
import type { DataChannelLike, PeerSession } from 'writer-sync/providers/webrtc';
import { createPeerSessionRegistry } from './peerSessionRegistry';
import { createPeerChannelFactory } from './peerChannelFactory';

/**
 * Where the P2P provider gets a channel from: whichever peer is actually
 * connected, under a label both ends derive the same way.
 */

const sessionOpening = (opened: string[]): PeerSession =>
  ({
    openChannel: (label: string) => {
      opened.push(label);
      return Promise.resolve({ label } as unknown as DataChannelLike);
    },
    channel: () => null,
    onChannel: () => () => undefined,
    onAnyChannel: () => () => undefined,
    createOffer: () => Promise.resolve(''),
    acceptOffer: () => Promise.resolve(''),
    acceptAnswer: () => Promise.resolve(),
    close: vi.fn(),
  }) as unknown as PeerSession;

describe('createPeerChannelFactory', () => {
  it('opens a channel on the connected peer, named for scope and purpose', async () => {
    const opened: string[] = [];
    const registry = createPeerSessionRegistry();
    registry.add({ session: sessionOpening(opened), deviceId: asDeviceId('peer-1') });

    const channel = await createPeerChannelFactory(registry).open({
      accessScopeId: 'space-9',
      channelId: 'doc-updates',
    });

    // Both ends derive the same label from the same facts, or the receiving
    // device cannot route the channel to its purpose.
    expect(opened).toEqual(['space-9/doc-updates']);
    expect((channel as unknown as { label: string }).label).toBe('space-9/doc-updates');
  });

  it('waits for a peer instead of failing while the device is alone', async () => {
    const opened: string[] = [];
    const registry = createPeerSessionRegistry();
    const factory = createPeerChannelFactory(registry);

    // A document opened before any pairing is ordinary; a rejection here would
    // be a failure nothing ever retries.
    const pending = factory.open({ accessScopeId: 's', channelId: 'c' });
    registry.add({ session: sessionOpening(opened), deviceId: asDeviceId('late-peer') });

    await expect(pending).resolves.toBeDefined();
    expect(opened).toEqual(['s/c']);
  });
});
