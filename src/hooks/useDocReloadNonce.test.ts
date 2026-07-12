import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { broadcastDocReload } from '@/lib/collab/docReloadChannel';
import { useDocReloadNonce } from './useDocReloadNonce';

const settle = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 40));
};

describe('useDocReloadNonce', () => {
  it('starts at 0 and increments on a reload for its doc', async () => {
    const { result } = renderHook(() => useDocReloadNonce('d1'));
    expect(result.current).toBe(0);

    await act(async () => {
      broadcastDocReload(['d1']);
      await settle();
    });
    expect(result.current).toBe(1);
  });

  it('ignores reloads for other docs', async () => {
    const { result } = renderHook(() => useDocReloadNonce('d1'));

    await act(async () => {
      broadcastDocReload(['other']);
      await settle();
    });
    expect(result.current).toBe(0);
  });
});
