import { createElement, type ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/db';
import { buildSpaceArchiveFor } from '@/lib/format/buildSpaceArchive';
import { seedRichSpace } from '@/test/fixtures';
import { useImportSpace } from './useImportSpace';

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(MemoryRouter, null, children);

const archiveFile = async (): Promise<File> => {
  const { blob, filename } = await buildSpaceArchiveFor('s1');
  return new File([new Uint8Array(await blob.arrayBuffer())], filename, {
    type: 'application/zip',
  });
};

describe('useImportSpace', () => {
  beforeEach(async () => {
    await seedRichSpace();
  });

  it('imports an archive file as a new space', async () => {
    const file = await archiveFile();
    const { result } = renderHook(() => useImportSpace(), { wrapper });

    await act(async () => {
      await result.current.importFile(file);
    });

    await waitFor(async () => {
      expect(await db.spaces.count()).toBe(2);
    });
    expect(result.current.error).toBeNull();
    expect(result.current.busy).toBe(false);
  });

  it('reports an error for invalid files without touching the database', async () => {
    const { result } = renderHook(() => useImportSpace(), { wrapper });

    await act(async () => {
      await result.current.importFile(
        new File(['garbage'], 'junk.zip', { type: 'application/zip' }),
      );
    });

    expect(result.current.error).toMatch(/not a readable \.zip/i);
    expect(await db.spaces.count()).toBe(1);
  });
});
