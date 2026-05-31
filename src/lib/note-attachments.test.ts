import { db } from '@/db/db';
import { NoteKind, NoteState, type Note } from '@/db/schema';
import { MAX_IMAGE_BYTES, MAX_NOTE_IMAGES } from '@/data/note-attachments';
import {
  addNoteImages,
  countNoteAttachments,
  deleteNoteAttachment,
} from './note-attachments';

const makeNote = (overrides: Partial<Note> = {}): Note => ({
  id: 'n1',
  spaceId: 's1',
  l: 0,
  t: 0,
  w: 184,
  h: 80,
  kind: NoteKind.Note,
  state: NoteState.User,
  body: '',
  createdAt: 1,
  ...overrides,
});

const pngFile = (name: string, bytes = 'data'): File =>
  new File([bytes], name, { type: 'image/png' });

describe('addNoteImages', () => {
  it('stores accepted images as attachments scoped to the note and space', async () => {
    const note = makeNote();
    await db.notes.put(note);

    const { added, rejected } = await addNoteImages(note, [pngFile('a.png')]);

    expect(rejected).toEqual([]);
    expect(added).toHaveLength(1);
    expect(added[0]?.blob).toBeInstanceOf(Blob);
    expect(added[0]?.blob.size).toBeGreaterThan(0);
    const stored = await db.noteAttachments.where('noteId').equals('n1').toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.spaceId).toBe('s1');
    expect(stored[0]?.name).toBe('a.png');
    expect(stored[0]?.mime).toBe('image/png');
  });

  it('rejects images larger than the size limit', async () => {
    const note = makeNote();
    await db.notes.put(note);
    const big = pngFile('big.png');
    Object.defineProperty(big, 'size', { value: MAX_IMAGE_BYTES + 1 });

    const { added, rejected } = await addNoteImages(note, [big]);

    expect(added).toHaveLength(0);
    expect(rejected[0]).toMatch(/larger than 5 MB/);
    expect(await countNoteAttachments('n1')).toBe(0);
  });

  it('rejects unsupported file types', async () => {
    const note = makeNote();
    await db.notes.put(note);
    const txt = new File(['x'], 'notes.txt', { type: 'text/plain' });

    const { added, rejected } = await addNoteImages(note, [txt]);

    expect(added).toHaveLength(0);
    expect(rejected[0]).toMatch(/unsupported type/);
    expect(await countNoteAttachments('n1')).toBe(0);
  });

  it(`enforces the limit of ${String(MAX_NOTE_IMAGES)} images per note`, async () => {
    const note = makeNote();
    await db.notes.put(note);

    const files = Array.from({ length: MAX_NOTE_IMAGES + 1 }, (_, i) =>
      pngFile(`img-${String(i)}.png`),
    );
    const { added, rejected } = await addNoteImages(note, files);

    expect(added).toHaveLength(MAX_NOTE_IMAGES);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]).toMatch(/limit of/);
    expect(await countNoteAttachments('n1')).toBe(MAX_NOTE_IMAGES);
  });

  it('counts pre-existing attachments toward the limit', async () => {
    const note = makeNote();
    await db.notes.put(note);
    await addNoteImages(note, [pngFile('first.png')]);

    const { added, rejected } = await addNoteImages(note, [
      pngFile('second.png'),
      pngFile('third.png'),
    ]);

    expect(added).toHaveLength(MAX_NOTE_IMAGES - 1);
    expect(rejected).toHaveLength(1);
    expect(await countNoteAttachments('n1')).toBe(MAX_NOTE_IMAGES);
  });

  it('never exceeds the limit when two uploads race', async () => {
    const note = makeNote();
    await db.notes.put(note);

    const [r1, r2] = await Promise.all([
      addNoteImages(note, [pngFile('a.png'), pngFile('b.png')]),
      addNoteImages(note, [pngFile('c.png'), pngFile('d.png')]),
    ]);

    expect(await countNoteAttachments('n1')).toBe(MAX_NOTE_IMAGES);
    expect(r1.added.length + r2.added.length).toBe(MAX_NOTE_IMAGES);
  });

  it('promotes a seed note to a user note when an image is added', async () => {
    const note = makeNote({ state: NoteState.SeedPrompt });
    await db.notes.put(note);

    await addNoteImages(note, [pngFile('a.png')]);

    expect((await db.notes.get('n1'))?.state).toBe(NoteState.User);
  });

  it('does not promote when every file is rejected', async () => {
    const note = makeNote({ state: NoteState.SeedPrompt });
    await db.notes.put(note);
    const txt = new File(['x'], 'a.txt', { type: 'text/plain' });

    await addNoteImages(note, [txt]);

    expect((await db.notes.get('n1'))?.state).toBe(NoteState.SeedPrompt);
  });
});

describe('deleteNoteAttachment', () => {
  it('removes the attachment by id', async () => {
    const note = makeNote();
    await db.notes.put(note);
    const { added } = await addNoteImages(note, [pngFile('a.png')]);
    const id = added[0]?.id ?? '';

    await deleteNoteAttachment(id);

    expect(await db.noteAttachments.get(id)).toBeUndefined();
  });
});
