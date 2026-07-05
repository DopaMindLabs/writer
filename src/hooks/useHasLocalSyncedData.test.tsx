import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import { useHasLocalSyncedData } from './useHasLocalSyncedData';

describe('useHasLocalSyncedData', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('is false when empty and becomes true once a synced row exists', async () => {
    const { result } = renderHook(() => useHasLocalSyncedData());
    await waitFor(() => {
      expect(result.current).toBe(false);
    });

    await db.docs.add({
      id: 'd',
      spaceId: 's',
      sectionId: 'x',
      name: '',
      body: '',
      meta: { wordCount: 0 },
      updatedAt: 1,
    });

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });
});
