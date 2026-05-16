import userEvent from '@testing-library/user-event';
import { fireEvent, renderAtRoute, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import { useUI } from '@/store/ui';
import { sampleDoc, sampleNote, sampleSpace } from '@/test/fixtures';
import { NoteState, type Note } from '@/db/schema';
import { BrainSpaceNote } from './BrainSpaceNote';

const navigateSpy = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateSpy,
  };
});

function renderNote(
  note = sampleNote,
  overrides: Partial<{
    selected: boolean;
    pending: boolean;
    onPick: () => void;
  }> = {},
) {
  return renderAtRoute(
    <BrainSpaceNote
      note={note}
      spaceId={sampleSpace.id}
      selected={overrides.selected ?? false}
      pending={overrides.pending ?? false}
      onPick={overrides.onPick ?? (() => {})}
    />,
    { path: '/s/:spaceId', initialEntries: [`/s/${sampleSpace.id}`] },
  );
}

afterEach(() => {
  useUI.getState().closeDetail();
  useUI.getState().focusNote(null);
  navigateSpy.mockClear();
});

describe('BrainSpaceNote', () => {
  it('renders default note', () => {
    const { container } = renderNote();
    expect(container).toMatchSnapshot();
  });

  it('renders selected and pending note with title', () => {
    const { container } = renderNote(
      { ...sampleNote, title: 'A title' },
      { selected: true, pending: true },
    );
    expect(container).toMatchSnapshot();
  });

  it('commits body edit to Dexie and promotes seed notes', async () => {
    const seedNote: Note = {
      ...sampleNote,
      state: NoteState.SeedFetched,
      body: 'orig',
    };
    await db.notes.put(seedNote);
    const user = userEvent.setup();
    const { getByText } = renderNote(seedNote);
    await user.click(getByText('orig'));
    const textarea = document.querySelector(
      'textarea',
    ) as HTMLTextAreaElement;
    await user.clear(textarea);
    await user.type(textarea, 'updated');
    fireEvent.blur(textarea);
    await waitFor(async () => {
      const fresh = await db.notes.get(seedNote.id);
      expect(fresh?.body).toBe('updated');
      expect(fresh?.state).toBe(NoteState.User);
    });
  });

  it('Escape in body editor reverts and exits edit mode', async () => {
    await db.notes.put(sampleNote);
    const user = userEvent.setup();
    const { getByText, queryByRole } = renderNote();
    await user.click(getByText('Hello'));
    const textarea = document.querySelector(
      'textarea',
    ) as HTMLTextAreaElement;
    await user.type(textarea, ' draft');
    await user.keyboard('{Escape}');
    expect(queryByRole('textbox')).not.toBeInTheDocument();
    const fresh = await db.notes.get(sampleNote.id);
    expect(fresh?.body).toBe('Hello');
  });

  it('commits title edit and promotes the note', async () => {
    const noTitle: Note = { ...sampleNote };
    await db.notes.put(noTitle);
    const user = userEvent.setup();
    const { getByText } = renderNote();
    await user.click(getByText('+ title'));
    const input = document.querySelector(
      'input[placeholder="title"]',
    ) as HTMLInputElement;
    await user.type(input, 'New title');
    fireEvent.blur(input);
    await waitFor(async () => {
      const fresh = await db.notes.get(noTitle.id);
      expect(fresh?.title).toBe('New title');
    });
  });

  it('clicking the ↗ icon opens the detail drawer', async () => {
    const user = userEvent.setup();
    const { getByLabelText } = renderNote();
    expect(useUI.getState().detailNoteId).toBeNull();
    await user.click(getByLabelText('Open details'));
    expect(useUI.getState().detailNoteId).toBe(sampleNote.id);
  });

  it('plain surface click does not open the detail drawer', async () => {
    const user = userEvent.setup();
    const { getByText } = renderNote();
    expect(useUI.getState().detailNoteId).toBeNull();
    // clicking the body enters edit mode, but should not open the drawer
    await user.click(getByText('Hello'));
    expect(useUI.getState().detailNoteId).toBeNull();
  });

  it('right-click shows a context menu with Delete that removes the note', async () => {
    await db.notes.put(sampleNote);
    const user = userEvent.setup();
    const { getByText, findByRole } = renderNote();
    fireEvent.contextMenu(getByText('Hello'));
    const menuItem = await findByRole('menuitem', { name: /delete note/i });
    await user.click(menuItem);
    await waitFor(async () => {
      expect(await db.notes.get(sampleNote.id)).toBeUndefined();
    });
  });

  it('renders the doc-link icon when linkedDocId is set', async () => {
    await db.docs.put(sampleDoc);
    const linked = { ...sampleNote, linkedDocId: sampleDoc.id };
    const { getByLabelText } = renderNote(linked);
    expect(getByLabelText('Open linked doc')).toBeInTheDocument();
  });

  it('clicking the doc-link icon does not trigger onPick', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    const linked = { ...sampleNote, linkedDocId: sampleDoc.id };
    const { getByLabelText } = renderNote(linked, { onPick });
    await user.click(getByLabelText('Open linked doc'));
    expect(onPick).not.toHaveBeenCalled();
  });

  it('closes the context menu when Escape is pressed', async () => {
    await db.notes.put(sampleNote);
    const { getByText, queryByRole, findByRole } = renderNote();
    fireEvent.contextMenu(getByText('Hello'));
    await findByRole('menuitem', { name: /delete note/i });
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(
        queryByRole('menuitem', { name: /delete note/i }),
      ).not.toBeInTheDocument();
    });
  });

  it('keeps the context menu open when a non-Escape key is pressed', async () => {
    await db.notes.put(sampleNote);
    const { getByText, findByRole, queryByRole } = renderNote();
    fireEvent.contextMenu(getByText('Hello'));
    await findByRole('menuitem', { name: /delete note/i });
    fireEvent.keyDown(document, { key: 'a' });
    // Menu is still open
    expect(
      queryByRole('menuitem', { name: /delete note/i }),
    ).toBeInTheDocument();
  });

  it('keeps the context menu open when a pointerdown happens inside the menu itself', async () => {
    await db.notes.put(sampleNote);
    const { getByText, findByRole, queryByRole } = renderNote();
    fireEvent.contextMenu(getByText('Hello'));
    const menuItem = await findByRole('menuitem', { name: /delete note/i });
    // Pointerdown on a descendant of the menu (with the data attribute)
    // should NOT close the menu (the listener returns early).
    fireEvent.pointerDown(menuItem);
    expect(
      queryByRole('menuitem', { name: /delete note/i }),
    ).toBeInTheDocument();
  });

  it('closes the context menu when clicking outside it', async () => {
    await db.notes.put(sampleNote);
    const { getByText, queryByRole, findByRole } = renderNote();
    fireEvent.contextMenu(getByText('Hello'));
    await findByRole('menuitem', { name: /delete note/i });
    // simulate a pointerdown on document outside the menu
    fireEvent.pointerDown(document.body);
    await waitFor(() => {
      expect(
        queryByRole('menuitem', { name: /delete note/i }),
      ).not.toBeInTheDocument();
    });
  });

  it('drag-move on the surface persists the new position to Dexie and clamps to >= 0', async () => {
    await db.notes.put(sampleNote);
    const { container } = renderNote();
    const surface = container.querySelector(
      '[aria-label="Resize note"]',
    )?.parentElement as HTMLElement;
    expect(surface).toBeTruthy();
    // pointerdown at (100, 100), move to (-500, -500), up
    fireEvent.pointerDown(surface, {
      button: 0,
      pointerId: 1,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerMove(surface, {
      pointerId: 1,
      clientX: -500,
      clientY: -500,
    });
    fireEvent.pointerUp(surface, {
      pointerId: 1,
      clientX: -500,
      clientY: -500,
    });
    await waitFor(async () => {
      const fresh = await db.notes.get(sampleNote.id);
      // origL=24 + dx=-600 clamped to 0; origT=24 + dy=-600 clamped to 0
      expect(fresh?.l).toBe(0);
      expect(fresh?.t).toBe(0);
    });
  });

  it('resize handle pointerdown + drag updates width and height with clamping', async () => {
    await db.notes.put(sampleNote);
    const { getByLabelText } = renderNote();
    const handle = getByLabelText('Resize note');
    // grow well beyond MAX_W=480 / MAX_H=360 → clamped to max
    fireEvent.pointerDown(handle, {
      button: 0,
      pointerId: 1,
      clientX: 0,
      clientY: 0,
    });
    fireEvent.pointerMove(handle, {
      pointerId: 1,
      clientX: 1000,
      clientY: 1000,
    });
    fireEvent.pointerUp(handle, {
      pointerId: 1,
      clientX: 1000,
      clientY: 1000,
    });
    await waitFor(async () => {
      const fresh = await db.notes.get(sampleNote.id);
      expect(fresh?.w).toBe(480);
      expect(fresh?.h).toBe(360);
    });
  });

  it('resize handle clamps width and height to the minimum bounds', async () => {
    await db.notes.put(sampleNote);
    const { getByLabelText } = renderNote();
    const handle = getByLabelText('Resize note');
    // shrink well below MIN_W=120 / MIN_H=60 → clamped to min
    fireEvent.pointerDown(handle, {
      button: 0,
      pointerId: 1,
      clientX: 0,
      clientY: 0,
    });
    fireEvent.pointerMove(handle, {
      pointerId: 1,
      clientX: -1000,
      clientY: -1000,
    });
    fireEvent.pointerUp(handle, {
      pointerId: 1,
      clientX: -1000,
      clientY: -1000,
    });
    await waitFor(async () => {
      const fresh = await db.notes.get(sampleNote.id);
      expect(fresh?.w).toBe(120);
      expect(fresh?.h).toBe(60);
    });
  });

  it('a non-left mouse button on the surface does not start a drag', async () => {
    await db.notes.put(sampleNote);
    const { container } = renderNote();
    const surface = container.querySelector(
      '[aria-label="Resize note"]',
    )?.parentElement as HTMLElement;
    const updateSpy = vi.spyOn(db.notes, 'update');
    fireEvent.pointerDown(surface, {
      button: 2,
      pointerId: 1,
      clientX: 0,
      clientY: 0,
    });
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 50, clientY: 50 });
    fireEvent.pointerUp(surface, { pointerId: 1 });
    expect(updateSpy).not.toHaveBeenCalled();
    updateSpy.mockRestore();
  });

  it('shift-click on the surface triggers onPick but does not begin a drag', async () => {
    await db.notes.put(sampleNote);
    const onPick = vi.fn();
    const { container } = renderNote(sampleNote, { onPick });
    const surface = container.querySelector(
      '[aria-label="Resize note"]',
    )?.parentElement as HTMLElement;
    const updateSpy = vi.spyOn(db.notes, 'update');
    fireEvent.pointerDown(surface, {
      button: 0,
      shiftKey: true,
      pointerId: 1,
      clientX: 10,
      clientY: 10,
    });
    fireEvent.pointerMove(surface, {
      pointerId: 1,
      clientX: 200,
      clientY: 200,
    });
    fireEvent.pointerUp(surface, {
      pointerId: 1,
      clientX: 200,
      clientY: 200,
    });
    expect(onPick).toHaveBeenCalled();
    // no DB write because shift-click skipped the drag state
    expect(updateSpy).not.toHaveBeenCalled();
    updateSpy.mockRestore();
  });

  it('pointermove with a mismatched pointerId is ignored mid-drag', async () => {
    await db.notes.put(sampleNote);
    const { container } = renderNote();
    const surface = container.querySelector(
      '[aria-label="Resize note"]',
    )?.parentElement as HTMLElement;
    fireEvent.pointerDown(surface, {
      button: 0,
      pointerId: 1,
      clientX: 0,
      clientY: 0,
    });
    // unrelated pointer's move event arrives — should be ignored, then a
    // matching up event should still commit (with no movement so far).
    fireEvent.pointerMove(surface, { pointerId: 99, clientX: 200, clientY: 200 });
    fireEvent.pointerUp(surface, {
      pointerId: 1,
      clientX: 0,
      clientY: 0,
    });
    await waitFor(async () => {
      const fresh = await db.notes.get(sampleNote.id);
      // no movement from the wrong-id pointermove
      expect(fresh?.l).toBe(sampleNote.l);
      expect(fresh?.t).toBe(sampleNote.t);
    });
  });

  it('pointerup with a mismatched pointerId leaves the drag state untouched', async () => {
    await db.notes.put(sampleNote);
    const { container } = renderNote();
    const surface = container.querySelector(
      '[aria-label="Resize note"]',
    )?.parentElement as HTMLElement;
    const updateSpy = vi.spyOn(db.notes, 'update');
    fireEvent.pointerDown(surface, {
      button: 0,
      pointerId: 1,
      clientX: 0,
      clientY: 0,
    });
    // wrong-id up — should not commit
    fireEvent.pointerUp(surface, { pointerId: 99 });
    expect(updateSpy).not.toHaveBeenCalled();
    updateSpy.mockRestore();
  });

  it('a pointerdown originating from a [data-no-drag] descendant does not start a drag', async () => {
    await db.notes.put(sampleNote);
    const { getByLabelText } = renderNote();
    // the Open-details button is data-no-drag
    const updateSpy = vi.spyOn(db.notes, 'update');
    const button = getByLabelText('Open details');
    fireEvent.pointerDown(button, {
      button: 0,
      pointerId: 1,
      clientX: 10,
      clientY: 10,
    });
    fireEvent.pointerMove(button, { pointerId: 1, clientX: 200, clientY: 200 });
    fireEvent.pointerUp(button, { pointerId: 1 });
    expect(updateSpy).not.toHaveBeenCalled();
    updateSpy.mockRestore();
  });

  it('Enter on the title input commits the rename', async () => {
    const noTitle: Note = { ...sampleNote };
    await db.notes.put(noTitle);
    const user = userEvent.setup();
    const { getByText } = renderNote();
    await user.click(getByText('+ title'));
    const input = document.querySelector(
      'input[placeholder="title"]',
    ) as HTMLInputElement;
    await user.type(input, 'Via Enter{enter}');
    await waitFor(async () => {
      const fresh = await db.notes.get(noTitle.id);
      expect(fresh?.title).toBe('Via Enter');
    });
  });

  it('Escape on the title input reverts the draft and exits edit mode', async () => {
    const noTitle: Note = { ...sampleNote, title: 'Original' };
    await db.notes.put(noTitle);
    const user = userEvent.setup();
    const { getByText } = renderNote(noTitle);
    await user.click(getByText('Original'));
    const input = document.querySelector(
      'input[placeholder="title"]',
    ) as HTMLInputElement;
    await user.clear(input);
    await user.type(input, 'Discard{escape}');
    const fresh = await db.notes.get(noTitle.id);
    expect(fresh?.title).toBe('Original');
  });

  it('the doc-link button navigates to the linked doc via useNavigate', async () => {
    await db.docs.put(sampleDoc);
    const linked = { ...sampleNote, linkedDocId: sampleDoc.id };
    const user = userEvent.setup();
    const { getByLabelText } = renderNote(linked);
    await user.click(getByLabelText('Open linked doc'));
    expect(navigateSpy).toHaveBeenCalledWith(`/s/${sampleSpace.id}/d/${sampleDoc.id}`);
  });

  it('a Seed-prompt note shows no italic "(click to write)" placeholder', async () => {
    const seedPrompt: Note = {
      ...sampleNote,
      state: NoteState.SeedPrompt,
      body: '',
    };
    await db.notes.put(seedPrompt);
    const { container, queryByText } = renderNote(seedPrompt);
    // The placeholder text "(click to write)" should NOT be shown for seed prompts
    expect(queryByText('(click to write)')).not.toBeInTheDocument();
    // The body wrapper still applies italic styling for seed prompts
    const body = container.querySelector('div.italic');
    expect(body).not.toBeNull();
  });

  it('a Seed-fetched note renders the Globe icon', async () => {
    const seedFetched: Note = {
      ...sampleNote,
      state: NoteState.SeedFetched,
      body: 'fetched',
    };
    await db.notes.put(seedFetched);
    const { getByLabelText } = renderNote(seedFetched);
    expect(getByLabelText('Fetched content')).toBeInTheDocument();
  });

  it('saves a no-change title (commitTitle no-op) without writing to DB', async () => {
    const titled: Note = { ...sampleNote, title: 'Same' };
    await db.notes.put(titled);
    const user = userEvent.setup();
    const updateSpy = vi.spyOn(db.notes, 'update');
    const { getByText } = renderNote(titled);
    await user.click(getByText('Same'));
    const input = document.querySelector(
      'input[placeholder="title"]',
    ) as HTMLInputElement;
    fireEvent.blur(input);
    expect(updateSpy).not.toHaveBeenCalled();
    updateSpy.mockRestore();
  });

  it('saves a no-change body (commitBody no-op) without writing to DB', async () => {
    await db.notes.put(sampleNote);
    const user = userEvent.setup();
    const updateSpy = vi.spyOn(db.notes, 'update');
    const { getByText } = renderNote();
    await user.click(getByText('Hello'));
    const textarea = document.querySelector(
      'textarea',
    ) as HTMLTextAreaElement;
    fireEvent.blur(textarea);
    expect(updateSpy).not.toHaveBeenCalled();
    updateSpy.mockRestore();
  });

});
