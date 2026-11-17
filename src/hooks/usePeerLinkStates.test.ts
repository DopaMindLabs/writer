import { act } from '@testing-library/react';
import { asDeviceId } from 'writer-sync/core';
import { renderHook } from '@/test/test-utils';
import { peerLinkStatus } from '@/lib/writerSyncIntegration/peerLinkStatus';
import { usePeerLinkStates } from './usePeerLinkStates';

const PEER = asDeviceId('peer-1');

describe('usePeerLinkStates', () => {
  // Cleared before, not after: an afterEach runs ahead of the render cleanup, so
  // a store change there would land on a component still mounted, outside act.
  beforeEach(() => {
    peerLinkStatus.reset();
  });

  it('reports nothing on a page that has connected to nothing', () => {
    const { result } = renderHook(() => usePeerLinkStates());

    expect(result.current).toEqual({});
  });

  it('follows a device as its link comes up and goes', () => {
    const { result } = renderHook(() => usePeerLinkStates());

    act(() => {
      peerLinkStatus.observe(PEER, 'connected');
    });
    expect(result.current).toEqual({ [PEER]: 'connected' });

    act(() => {
      peerLinkStatus.observe(PEER, 'interrupted');
    });
    expect(result.current).toEqual({ [PEER]: 'dropped' });
  });

  it('stops following once unmounted', () => {
    const { result, unmount } = renderHook(() => usePeerLinkStates());
    unmount();

    act(() => {
      peerLinkStatus.observe(PEER, 'connected');
    });

    expect(result.current).toEqual({});
  });
});
