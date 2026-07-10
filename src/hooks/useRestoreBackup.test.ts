import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/db';
import type { Backup } from '@/db/schema';
import { createSpaceBackup } from '@/lib/backup/createSpaceBackup';
import { sampleSpace, seedRichSpace, serializedBody } from '@/test/fixtures';
import { isRestorableBackup, useRestoreBackup } from './useRestoreBackup';

const mdZipBackup = {
  id: 'b-md',
  when: 1,
  scope: 's1',
  kind: 'manual',
  format: 'md-zip',
  size: 1,
  payload: new Blob(['x']),
} as Backup;

describe('isRestorableBackup', () => {
  it('accepts archive-v2 and rejects markdown-only backups', async () => {
    await seedRichSpace();
    const { backup } = await createSpaceBackup('s1');
    expect(isRestorableBackup(backup)).toBe(true);
    expect(isRestorableBackup(mdZipBackup)).toBe(false);
  });
});

describe('useRestoreBackup', () => {
  beforeEach(async () => {
    await seedRichSpace();
  });

  it('runs the full request → confirm → restored flow', async () => {
    const { backup } = await createSpaceBackup('s1');
    await db.docs.update('d1', { body: serializedBody('Changed.') });

    const { result } = renderHook(() => useRestoreBackup(sampleSpace));
    act(() => {
      result.current.request(backup);
    });
    expect(result.current.pending?.id).toBe(backup.id);

    await act(async () => {
      await result.current.handleConfirm();
    });
    await waitFor(() => {
      expect(result.current.restored).toBe(true);
    });
    expect(result.current.pending).toBeNull();
    expect(result.current.error).toBeNull();
    const doc = await db.docs.get('d1');
    expect(doc?.body).not.toContain('Changed.');
  });

  it('ignores requests for non-restorable backups', () => {
    const { result } = renderHook(() => useRestoreBackup(sampleSpace));
    act(() => {
      result.current.request(mdZipBackup);
    });
    expect(result.current.pending).toBeNull();
  });

  it('confirm is a no-op without a pending backup', async () => {
    const { result } = renderHook(() => useRestoreBackup(sampleSpace));
    await act(async () => {
      await result.current.handleConfirm();
    });
    expect(result.current.busy).toBe(false);
    expect(result.current.restored).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('opening the dialog does not clear the pending backup', async () => {
    const { backup } = await createSpaceBackup('s1');
    const { result } = renderHook(() => useRestoreBackup(sampleSpace));
    act(() => {
      result.current.request(backup);
    });
    act(() => {
      result.current.handleOpenChange(true);
    });
    expect(result.current.pending?.id).toBe(backup.id);
  });

  it('keeps the dialog open while busy and clears pending on close', async () => {
    const { backup } = await createSpaceBackup('s1');
    const { result } = renderHook(() => useRestoreBackup(sampleSpace));
    act(() => {
      result.current.request(backup);
    });
    act(() => {
      result.current.handleOpenChange(false);
    });
    expect(result.current.pending).toBeNull();
  });

  it('captures parse failures as an error message', async () => {
    const { result } = renderHook(() => useRestoreBackup(sampleSpace));
    act(() => {
      result.current.request({ ...mdZipBackup, format: 'archive-v2' });
    });
    await act(async () => {
      await result.current.handleConfirm();
    });
    expect(result.current.error).toMatch(/not a readable \.zip/i);
    expect(result.current.restored).toBe(false);
  });
});
