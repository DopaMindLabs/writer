import { renderHook, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import type { NoteAttachment } from '@/db/schema';
import { useNoteAttachments } from './useNoteAttachments';

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
    // Seed an attachment to prove the empty result is the no-noteId short
    // circuit, not just an empty table.
    await db.noteAttachments.put(makeAttachment({ id: 'x', noteId: 'n1' }));
    const { result } = renderHook(() => useNoteAttachments(null));
    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });
});
