import { db } from '@/db/db';
import { newId } from '@/lib/ids';
import { invariant } from '@/lib/invariant';
import { getNoteType } from '@/data/note-types';
import { NoteKind, NoteState, type Note } from '@/db/schema';

// A pdf card is a text note; it links to the reader rather than drawing the page.
const CARD_W = 184;
const CARD_H = 80;

/**
 * Files a library PDF into the brain space as a pdf card: a Note anchored to the
 * media item through `mediaId`, placed at the given canvas point. The single
 * code path for filing — both the reader's "add to brain space" and dragging a
 * library row onto the canvas land here — so the card is built one way.
 */
export const filePdfToBrainSpace = async (input: {
  spaceId: string;
  mediaId: string;
  at: { l: number; t: number };
}): Promise<Note> => {
  invariant(input.spaceId.length > 0, 'filePdfToBrainSpace: spaceId required');
  invariant(input.mediaId.length > 0, 'filePdfToBrainSpace: mediaId required');
  const note: Note = {
    id: newId(),
    spaceId: input.spaceId,
    l: Math.max(0, Math.round(input.at.l)),
    t: Math.max(0, Math.round(input.at.t)),
    w: CARD_W,
    h: CARD_H,
    kind: NoteKind.Pdf,
    state: NoteState.User,
    body: '',
    mediaId: input.mediaId,
    createdAt: Date.now(),
    typeVersion: getNoteType(NoteKind.Pdf).version,
  };
  await db.notes.add(note);
  return note;
};
