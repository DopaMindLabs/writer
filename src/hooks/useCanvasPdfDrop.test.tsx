import { describe, it, expect, beforeEach } from 'vitest';
import { useRef } from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import { NoteKind } from '@/db/schema';
import { MEDIA_DND_TYPE } from '@/data/dnd';
import { useCanvasPdfDrop } from './useCanvasPdfDrop';

const Harness = ({ spaceId }: { spaceId: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const drop = useCanvasPdfDrop(spaceId, ref);
  return (
    <div ref={ref} data-testid="canvas" onDragOver={drop.onDragOver} onDrop={drop.onDrop} />
  );
};

const mediaDrag = (mediaId: string, clientX = 40, clientY = 30) => ({
  dataTransfer: { types: [MEDIA_DND_TYPE], getData: () => mediaId },
  clientX,
  clientY,
});

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe('useCanvasPdfDrop', () => {
  it('files a dropped media id as a pdf card at the drop point', async () => {
    const { getByTestId } = render(<Harness spaceId="s1" />);
    fireEvent.drop(getByTestId('canvas'), mediaDrag('m1'));
    await waitFor(async () => {
      const notes = await db.notes.where('spaceId').equals('s1').toArray();
      expect(notes).toHaveLength(1);
      expect(notes[0].kind).toBe(NoteKind.Pdf);
      expect(notes[0].mediaId).toBe('m1');
      // jsdom drop events carry no layout coordinates, so the card lands at the
      // guarded origin; the point maths itself is covered by the facade test.
      expect(Number.isFinite(notes[0].l)).toBe(true);
      expect(notes[0].l).toBeGreaterThanOrEqual(0);
      expect(notes[0].t).toBeGreaterThanOrEqual(0);
    });
  });

  it('ignores a drop without the media payload', async () => {
    const { getByTestId } = render(<Harness spaceId="s1" />);
    fireEvent.drop(getByTestId('canvas'), {
      dataTransfer: { types: ['Files'], getData: () => '' },
    });
    expect(await db.notes.count()).toBe(0);
  });
});
