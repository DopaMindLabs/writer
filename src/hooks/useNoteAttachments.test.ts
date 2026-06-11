import { renderHook, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import type { NoteAttachment } from '@/db/schema';
import {
  useNoteAttachments,
  useNoteAttachmentsBySpace,
} from './useNoteAttachments';

const makeAttachment = (overrides: Partial<NoteAttachment>): NoteAttachment => ({
  id: 'a',
  noteId: 'n1',
  spaceId: 's1',
  name: 'a.png',
  mime: 'image/png',
  size: 1,
  blob: new Blob(['x']),
  createdAt: 1,
  ...overrides,
});

describe('useNoteAttachments', () => {
  it('returns a note attachments oldest-first', async () => {
    await db.noteAttachments.bulkPut([
      makeAttachment({ id: 'late', createdAt: 300 }),
      makeAttachment({ id: 'early', createdAt: 100 }),
      makeAttachment({ id: 'mid', createdAt: 200 }),
    ]);

    const { result } = renderHook(() => useNoteAttachments('n1'));

    await waitFor(() => {
      expect(result.current.map((a) => a.id)).toEqual(['early', 'mid', 'late']);
    });
  });

  it('scopes results to the given note', async () => {
    await db.noteAttachments.bulkPut([
      makeAttachment({ id: 'mine', noteId: 'n1' }),
      makeAttachment({ id: 'other', noteId: 'n2' }),
    ]);

    const { result } = renderHook(() => useNoteAttachments('n1'));

    await waitFor(() => {
      expect(result.current.map((a) => a.id)).toEqual(['mine']);
    });
  });

  it('returns an empty list when no noteId is given', async () => {
    await db.noteAttachments.put(makeAttachment({ id: 'x', noteId: 'n1' }));
    const { result } = renderHook(() => useNoteAttachments(null));
    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });
});

describe('useNoteAttachmentsBySpace', () => {
  it('groups a space attachments by note, oldest-first within each note', async () => {
    await db.noteAttachments.bulkPut([
      makeAttachment({ id: 'n1-late', noteId: 'n1', createdAt: 300 }),
      makeAttachment({ id: 'n1-early', noteId: 'n1', createdAt: 100 }),
      makeAttachment({ id: 'n2-only', noteId: 'n2', createdAt: 50 }),
      makeAttachment({ id: 'other-space', noteId: 'n3', spaceId: 's2' }),
    ]);

    const { result } = renderHook(() => useNoteAttachmentsBySpace('s1'));

    await waitFor(() => {
      expect(result.current.get('n1')?.map((a) => a.id)).toEqual([
        'n1-early',
        'n1-late',
      ]);
    });
    expect(result.current.get('n2')?.map((a) => a.id)).toEqual(['n2-only']);
    expect(result.current.has('n3')).toBe(false);
  });

  it('returns an empty map when no spaceId is given', async () => {
    await db.noteAttachments.put(makeAttachment({ id: 'x', spaceId: 's1' }));
    const { result } = renderHook(() => useNoteAttachmentsBySpace(null));
    await waitFor(() => {
      expect(result.current.size).toBe(0);
    });
  });
});
