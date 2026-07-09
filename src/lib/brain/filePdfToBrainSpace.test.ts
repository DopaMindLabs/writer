import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/db';
import { NoteKind } from '@/db/schema';
import { filePdfToBrainSpace } from './filePdfToBrainSpace';

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe('filePdfToBrainSpace', () => {
  it('creates a pdf card anchored to the media at the drop point', async () => {
    const note = await filePdfToBrainSpace({
      spaceId: 's1',
      mediaId: 'm1',
      at: { l: 120, t: 60 },
    });
    expect(note.kind).toBe(NoteKind.Pdf);
    expect(note.mediaId).toBe('m1');
    expect(note.l).toBe(120);
    expect(note.t).toBe(60);
    expect(note.typeVersion).toBe('1.0.0');
    expect(await db.notes.get(note.id)).toBeDefined();
  });

  it('clamps a negative drop point to the canvas origin', async () => {
    const note = await filePdfToBrainSpace({
      spaceId: 's1',
      mediaId: 'm1',
      at: { l: -50, t: -10 },
    });
    expect(note.l).toBe(0);
    expect(note.t).toBe(0);
  });

  it('requires a space and a media id', async () => {
    await expect(
      filePdfToBrainSpace({ spaceId: '', mediaId: 'm1', at: { l: 0, t: 0 } }),
    ).rejects.toThrow();
    await expect(
      filePdfToBrainSpace({ spaceId: 's1', mediaId: '', at: { l: 0, t: 0 } }),
    ).rejects.toThrow();
  });
});
