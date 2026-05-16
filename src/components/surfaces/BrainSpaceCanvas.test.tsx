import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { renderWithProviders, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import {
  seedBrainSpaceCanvas,
  sampleNote,
  sampleSpace,
} from '@/test/fixtures';
import { useUI } from '@/store/ui';
import { BrainSpaceCanvas } from './BrainSpaceCanvas';

describe('BrainSpaceCanvas', () => {
  it('renders canvas with seeded notes and connection', async () => {
    await seedBrainSpaceCanvas();
    const { container, findAllByText } = renderWithProviders(
      <BrainSpaceCanvas spaceId="s1" />,
    );
    await findAllByText('Hello');
    expect(container).toMatchSnapshot();
  });

  it('clicking a toolbar kind adds a new note to Dexie', async () => {
    await db.spaces.put(sampleSpace);
    const user = userEvent.setup();
    const { findByText } = renderWithProviders(<BrainSpaceCanvas spaceId="s1" />);
    const button = await findByText(/\+ blank/i);
    expect(await db.notes.count()).toBe(0);
    await user.click(button);
    await waitFor(async () => {
      expect(await db.notes.count()).toBe(1);
    });
  });

  it('renders the empty state when no notes exist', async () => {
    await db.spaces.put(sampleSpace);
    const { findByText } = renderWithProviders(<BrainSpaceCanvas spaceId="s1" />);
    expect(await findByText('start dumping')).toBeInTheDocument();
  });

  it('shift-clicking two different notes creates a connection in Dexie', async () => {
    await db.spaces.put(sampleSpace);
    await db.notes.bulkPut([
      { ...sampleNote, id: 'n1', body: 'first' },
      { ...sampleNote, id: 'n2', body: 'second', l: 240, t: 120 },
    ]);
    const { findByText, getByText } = renderWithProviders(
      <BrainSpaceCanvas spaceId="s1" />,
    );
    await findByText('first');
    // The body text has data-no-drag + stopPropagation; fire on the outer
    // note container (the parent of the body div) so the surface handler
    // actually runs.
    const note1 = getByText('first').closest('.group') as HTMLElement;
    const note2 = getByText('second').closest('.group') as HTMLElement;
    fireEvent.pointerDown(note1, {
      button: 0,
      shiftKey: true,
      pointerId: 1,
    });
    expect(await findByText(/shift-click another note to connect/i)).toBeInTheDocument();
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

  it('shift-clicking the same note twice cancels the pending connection without creating one', async () => {
    await db.spaces.put(sampleSpace);
    await db.notes.put({ ...sampleNote, id: 'n1', body: 'only' });
    const { findByText, getByText, queryByText } = renderWithProviders(
      <BrainSpaceCanvas spaceId="s1" />,
    );
    await findByText('only');
    const note = getByText('only').closest('.group') as HTMLElement;
    fireEvent.pointerDown(note, {
      button: 0,
      shiftKey: true,
      pointerId: 1,
    });
    expect(await findByText(/shift-click another note to connect/i)).toBeInTheDocument();
    fireEvent.pointerDown(note, {
      button: 0,
      shiftKey: true,
      pointerId: 2,
    });
    await waitFor(() =>
      expect(
        queryByText(/shift-click another note to connect/i),
      ).not.toBeInTheDocument(),
    );
    expect(await db.connections.count()).toBe(0);
  });

  it('skips rendering orphaned connections whose endpoints do not exist', async () => {
    await db.spaces.put(sampleSpace);
    await db.notes.put({ ...sampleNote, id: 'n1', body: 'present' });
    await db.connections.put({
      id: 'c-orphan',
      spaceId: 's1',
      fromNoteId: 'n1',
      toNoteId: 'missing-note',
      createdAt: 0,
    });
    const { container, findByText } = renderWithProviders(
      <BrainSpaceCanvas spaceId="s1" />,
    );
    await findByText('present');
    // Only the SVG <g> wrapper exists; no <line>/<path> children for the
    // orphan connection (BrainSpaceConnection renders its own SVG content).
    const g = container.querySelector('svg g');
    expect(g).not.toBeNull();
    expect(g?.children.length).toBe(0);
  });

  it('renders one toolbar button per noteKind defined by the space template', async () => {
    await db.spaces.put({ ...sampleSpace, template: 'fiction' });
    const { findByText, getByText } = renderWithProviders(
      <BrainSpaceCanvas spaceId="s1" />,
    );
    // fiction template defines noteKinds [Note, Char, Place, Lore], rendered
    // via NOTE_KIND_LABEL as "thought", "person", "place", "lore".
    expect(await findByText(/\+ thought$/i)).toBeInTheDocument();
    expect(getByText(/\+ person$/i)).toBeInTheDocument();
    expect(getByText(/\+ place$/i)).toBeInTheDocument();
    expect(getByText(/\+ lore$/i)).toBeInTheDocument();
  });

  it('background pointerdown clears focusedNoteId and any pending-from selection', async () => {
    await db.spaces.put(sampleSpace);
    await db.notes.put({ ...sampleNote, id: 'n1', body: 'one' });
    useUI.getState().focusNote('n1');
    const { container, findByText } = renderWithProviders(
      <BrainSpaceCanvas spaceId="s1" />,
    );
    await findByText('one');
    // The outermost canvas div with the radial-gradient background is the
    // event target we want.
    const canvas = container.querySelector(
      '[data-tour="tour-brainspace-canvas"]',
    ) as HTMLElement;
    expect(canvas).not.toBeNull();
    fireEvent.pointerDown(canvas, { target: canvas, button: 0 });
    expect(useUI.getState().focusedNoteId).toBeNull();
  });
});
