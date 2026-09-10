import { act } from '@testing-library/react';
import { asDeviceId } from 'writer-sync/core';
import { renderHook } from '@/test/test-utils';
import { peerLinkStatus } from '@/lib/writerSyncIntegration/peerLinkStatus';
import { usePeerLinkDropped } from './usePeerLinkDropped';

const PEER = asDeviceId('peer-1');

describe('usePeerLinkDropped', () => {
  // Cleared before, not after: an afterEach runs ahead of the render cleanup, so
  // a store change there would land on a component still mounted, outside act.
  beforeEach(() => {
    peerLinkStatus.reset();
  });

  it('is quiet on a fresh page, which is connected to nothing', () => {
    // The state every app start is in, and the reason this is not "nothing is
    // connected": that would fire on every launch and mean nothing.
    const { result } = renderHook(() => usePeerLinkDropped());

    expect(result.current).toBe(false);
  });

  it('is quiet while a link is merely coming up', () => {
    const { result } = renderHook(() => usePeerLinkDropped());

    act(() => {
      peerLinkStatus.observe(PEER, 'connecting');
    });

    expect(result.current).toBe(false);
  });

  it('says so once a working link is lost', () => {
    const { result } = renderHook(() => usePeerLinkDropped());

    act(() => {
      peerLinkStatus.observe(PEER, 'connected');
      peerLinkStatus.observe(PEER, 'interrupted');
    });

    expect(result.current).toBe(true);
  });

  it('goes quiet again when the device comes back', () => {
    const { result } = renderHook(() => usePeerLinkDropped());
    act(() => {
      peerLinkStatus.observe(PEER, 'connected');
      peerLinkStatus.observe(PEER, 'interrupted');
    });

    act(() => {
      peerLinkStatus.observe(PEER, 'connected');
    });

    expect(result.current).toBe(false);
  });
});
