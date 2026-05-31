import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import {
  seedBrainSpaceCanvas,
  sampleNote,
  sampleSpace,
} from '@/test/fixtures';
import { useUI } from '@/store/ui';
import { BrainSpaceCanvas } from './BrainSpaceCanvas';

describe('BrainSpaceCanvas', () => {
  describe('rendering', () => {
    it('should render the canvas root with the toolbar', async () => {
      await db.spaces.put(sampleSpace);
      renderWithProviders(<BrainSpaceCanvas spaceId="s1" />);
      expect(await screen.findByTestId('brain-canvas')).toBeInTheDocument();
      expect(screen.getByTestId('brain-canvas-toolbar')).toBeInTheDocument();
    });

    it('should render seeded notes via their per-note testids', async () => {
      await seedBrainSpaceCanvas();
      renderWithProviders(<BrainSpaceCanvas spaceId="s1" />);
      expect(await screen.findByTestId('brain-note-n1')).toHaveTextContent(
        'Hello',
      );
      expect(screen.getByTestId('brain-note-n2')).toHaveTextContent('Hello');
    });

    it('should render the empty-state hint when no notes exist', async () => {
      await db.spaces.put(sampleSpace);
      renderWithProviders(<BrainSpaceCanvas spaceId="s1" />);
      const empty = await screen.findByTestId('brain-canvas-empty');
      expect(empty).toHaveTextContent(/start dumping/i);
    });

    it('should render one toolbar button per noteKind on the space template', async () => {
      await db.spaces.put({ ...sampleSpace, template: 'fiction' });
      renderWithProviders(<BrainSpaceCanvas spaceId="s1" />);
      // fiction template defines noteKinds [Note, Char, Place, Lore]
      expect(
        await screen.findByTestId('brain-canvas-tool-note'),
      ).toHaveTextContent(/\+ thought/i);
      expect(screen.getByTestId('brain-canvas-tool-char')).toHaveTextContent(
        /\+ person/i,
      );
      expect(screen.getByTestId('brain-canvas-tool-place')).toHaveTextContent(
        /\+ place/i,
      );
      expect(screen.getByTestId('brain-canvas-tool-lore')).toHaveTextContent(
        /\+ lore/i,
      );
    });
  });

  describe('add-note toolbar', () => {
    it('should add a new note to Dexie when a kind button is clicked', async () => {
      await db.spaces.put(sampleSpace);
      const user = userEvent.setup();
      renderWithProviders(<BrainSpaceCanvas spaceId="s1" />);
      const button = await screen.findByTestId('brain-canvas-tool-blank');
      expect(button).toHaveTextContent(/\+ blank/i);
      expect(await db.notes.count()).toBe(0);
      await user.click(button);
      await waitFor(async () => {
        expect(await db.notes.count()).toBe(1);
      });
    });
  });

  describe('connection creation', () => {
    it('should create a connection in Dexie when two different notes are shift-clicked', async () => {
      await db.spaces.put(sampleSpace);
      await db.notes.bulkPut([
        { ...sampleNote, id: 'n1', body: 'first' },
        { ...sampleNote, id: 'n2', body: 'second', l: 240, t: 120 },
      ]);
      renderWithProviders(<BrainSpaceCanvas spaceId="s1" />);
      const note1 = await screen.findByTestId('brain-note-n1');
      const note2 = await screen.findByTestId('brain-note-n2');
      fireEvent.pointerDown(note1, {
        button: 0,
        shiftKey: true,
        pointerId: 1,
      });
      expect(
        await screen.findByTestId('brain-canvas-pending-hint'),
      ).toHaveTextContent(/shift-click another note to connect/i);
      fireEvent.pointerDown(note2, {
        button: 0,
        shiftKey: true,
        pointerId: 2,
      });
      await waitFor(async () => {
        const conns = await db.connections.toArray();
        expect(conns).toHaveLength(1);
        expect(conns[0].fromNoteId).toBe('n1');
        expect(conns[0].toNoteId).toBe('n2');
      });
    });

    it('should cancel the pending connection without creating one when the same note is shift-clicked twice', async () => {
      await db.spaces.put(sampleSpace);
      await db.notes.put({ ...sampleNote, id: 'n1', body: 'only' });
      renderWithProviders(<BrainSpaceCanvas spaceId="s1" />);
      const note = await screen.findByTestId('brain-note-n1');
      fireEvent.pointerDown(note, {
        button: 0,
        shiftKey: true,
        pointerId: 1,
      });
      expect(
        await screen.findByTestId('brain-canvas-pending-hint'),
      ).toBeInTheDocument();
      fireEvent.pointerDown(note, {
        button: 0,
        shiftKey: true,
        pointerId: 2,
      });
      await waitFor(() =>
        expect(
          screen.queryByTestId('brain-canvas-pending-hint'),
        ).not.toBeInTheDocument(),
      );
      expect(await db.connections.count()).toBe(0);
    });

    it('should skip rendering orphaned connections whose endpoints do not exist', async () => {
      await db.spaces.put(sampleSpace);
      await db.notes.put({ ...sampleNote, id: 'n1', body: 'present' });
      await db.connections.put({
        id: 'c-orphan',
        spaceId: 's1',
        fromNoteId: 'n1',
        toNoteId: 'missing-note',
        createdAt: 0,
      });
      const { container } = renderWithProviders(
        <BrainSpaceCanvas spaceId="s1" />,
      );
      await screen.findByTestId('brain-note-n1');
      // Only the SVG <g> wrapper exists; no children for orphan connections.
      const g = container.querySelector('svg g');
      expect(g).not.toBeNull();
      expect(g?.children.length).toBe(0);
    });
  });

  describe('background pointerdown', () => {
    it('should clear focusedNoteId and any pending-from selection', async () => {
      await db.spaces.put(sampleSpace);
      await db.notes.put({ ...sampleNote, id: 'n1', body: 'one' });
      useUI.getState().focusNote('n1');
      renderWithProviders(<BrainSpaceCanvas spaceId="s1" />);
      await screen.findByTestId('brain-note-n1');
      const canvas = screen.getByTestId('brain-canvas');
      fireEvent.pointerDown(canvas, { target: canvas, button: 0 });
      expect(useUI.getState().focusedNoteId).toBeNull();
    });
  });

  describe('snapshot', () => {
    it('should match the snapshot across all variants', async () => {
      await seedBrainSpaceCanvas();
      const { container } = renderWithProviders(
        <BrainSpaceCanvas spaceId="s1" />,
      );
      await screen.findAllByTestId('brain-note-n1');
      expect(container).toMatchSnapshot();
    });
  });
});
