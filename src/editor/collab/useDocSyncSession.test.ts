import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  createFakeEngine,
  createFakeUpdateLog,
} from '@/test/docsync/fakes';
import { useDocSyncSession } from './useDocSyncSession';

const makeDeps = () => ({ engine: createFakeEngine(), log: createFakeUpdateLog() });

describe('useDocSyncSession', () => {
  it('opens a session and closes it on unmount', async () => {
    const deps = makeDeps();
    const { result, unmount } = renderHook(() =>
      useDocSyncSession('doc-a', 0, deps),
    );
    await waitFor(() => expect(result.current).not.toBeNull());
    const opened = deps.engine.opened;
    expect(opened).toHaveLength(1);
    expect(opened[0].destroyed).toBe(false);
    unmount();
    expect(opened[0].destroyed).toBe(true);
  });

  it('opens a fresh session when the nonce changes', async () => {
    const deps = makeDeps();
    const { result, rerender } = renderHook(
      ({ nonce }: { nonce: number }) =>
        useDocSyncSession('doc-a', nonce, deps),
      { initialProps: { nonce: 0 } },
    );
    await waitFor(() => expect(result.current).not.toBeNull());
    const firstKey = result.current?.key;
    act(() => {
      rerender({ nonce: 1 });
    });
    await waitFor(() => expect(result.current?.key).not.toBe(firstKey));
    expect(deps.engine.opened).toHaveLength(2);
  });
});
