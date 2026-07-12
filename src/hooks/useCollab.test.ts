import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import { useCollab } from './useCollab';

describe('useCollab', () => {
  it('returns a collab config once the profile is available', async () => {
    const { result } = renderHook(() => useCollab());
    await waitFor(() => {
      expect(result.current).toBeDefined();
    });
    expect(typeof result.current?.providerFactory).toBe('function');
    expect(result.current?.cursorColor).toMatch(/^var\(--presence-/);
  });

  it('keeps the same config reference across re-renders', async () => {
    const { result, rerender } = renderHook(() => useCollab());
    await waitFor(() => {
      expect(result.current).toBeDefined();
    });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it('derives the cursor label and colour from the stored profile', async () => {
    await db.meta.put({
      key: 'profile',
      value: { authorId: 'a1', displayName: 'Ada', presenceHue: 'presence-3' },
    });
    const { result } = renderHook(() => useCollab());
    await waitFor(() => {
      expect(result.current?.username).toBe('Ada');
    });
    expect(result.current?.cursorColor).toBe('var(--presence-3)');
  });
});
