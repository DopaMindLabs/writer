import userEvent from '@testing-library/user-event';
import { fireEvent, renderAtRoute, screen, waitFor } from '@/test/test-utils';
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

const renderNote = (
  note = sampleNote,
  overrides: Partial<{
    selected: boolean;
    pending: boolean;
    onPick: () => void;
  }> = {},
) => {
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
};

afterEach(() => {
  useUI.getState().closeDetail();
  useUI.getState().focusNote(null);
  navigateSpy.mockClear();
});

describe('BrainSpaceNote', () => {
  describe('rendering', () => {
    it('should render the note body content', () => {
      renderNote();
      expect(screen.getByTestId(`brain-note-${sampleNote.id}-body`)).toHaveTextContent(
        'Hello',
      );
    });

    it('should render the "+ title" placeholder button when the note has no title', () => {
      renderNote();
      expect(
        screen.getByTestId(`brain-note-${sampleNote.id}-add-title`),
      ).toHaveTextContent('+ title');
    });

    it('should render the existing title when one is set', () => {
      renderNote({ ...sampleNote, title: 'A title' });
      expect(
        screen.getByTestId(`brain-note-${sampleNote.id}-title`),
      ).toHaveTextContent('A title');
    });

    it('should render the open-details icon button', () => {
      renderNote();
      expect(
        screen.getByTestId(`brain-note-${sampleNote.id}-open-details`),
      ).toHaveAttribute('aria-label', 'Open details');
    });

    it('should render the resize handle with the Resize note aria-label', () => {
      renderNote();
      expect(
        screen.getByTestId(`brain-note-${sampleNote.id}-resize-handle`),
      ).toHaveAttribute('aria-label', 'Resize note');
    });
  });

  describe('body editing', () => {
    it('should commit body edit to Dexie and promote seed notes', async () => {
      const seedNote: Note = {
        ...sampleNote,
        state: NoteState.SeedFetched,
        body: 'orig',
      };
      await db.notes.put(seedNote);
      const user = userEvent.setup();
      renderNote(seedNote);
      await user.click(screen.getByTestId(`brain-note-${seedNote.id}-body`));
      const textarea = screen.getByTestId(
        `brain-note-${seedNote.id}-body-input`,
      );
      await user.clear(textarea);
      await user.type(textarea, 'updated');
      fireEvent.blur(textarea);
      await waitFor(async () => {
        const fresh = await db.notes.get(seedNote.id);
        expect(fresh?.body).toBe('updated');
        expect(fresh?.state).toBe(NoteState.User);
      });
    });

    it('should revert and exit edit mode when Escape is pressed in the body editor', async () => {
      await db.notes.put(sampleNote);
      const user = userEvent.setup();
      renderNote();
      await user.click(screen.getByTestId(`brain-note-${sampleNote.id}-body`));
      const textarea = screen.getByTestId(
        `brain-note-${sampleNote.id}-body-input`,
      );
      await user.type(textarea, ' draft');
      await user.keyboard('{Escape}');
      expect(
        screen.queryByTestId(`brain-note-${sampleNote.id}-body-input`),
      ).not.toBeInTheDocument();
      const fresh = await db.notes.get(sampleNote.id);
      expect(fresh?.body).toBe('Hello');
    });

    it('should not write to DB when committing a no-change body (commitBody no-op)', async () => {
      await db.notes.put(sampleNote);
      const user = userEvent.setup();
      const updateSpy = vi.spyOn(db.notes, 'update');
      renderNote();
      await user.click(screen.getByTestId(`brain-note-${sampleNote.id}-body`));
      const textarea = screen.getByTestId(
        `brain-note-${sampleNote.id}-body-input`,
      );
      fireEvent.blur(textarea);
      expect(updateSpy).not.toHaveBeenCalled();
      updateSpy.mockRestore();
    });
  });

  describe('title editing', () => {
    it('should commit a title edit and promote the note', async () => {
      const noTitle: Note = { ...sampleNote };
      await db.notes.put(noTitle);
      const user = userEvent.setup();
      renderNote();
      await user.click(
        screen.getByTestId(`brain-note-${noTitle.id}-add-title`),
      );
      const input = screen.getByTestId(
        `brain-note-${noTitle.id}-title-input`,
      );
      expect(input).toHaveAttribute('placeholder', 'title');
      await user.type(input, 'New title');
      fireEvent.blur(input);
      await waitFor(async () => {
        const fresh = await db.notes.get(noTitle.id);
        expect(fresh?.title).toBe('New title');
      });
    });

    it('should commit the rename when Enter is pressed in the title input', async () => {
      const noTitle: Note = { ...sampleNote };
      await db.notes.put(noTitle);
      const user = userEvent.setup();
      renderNote();
      await user.click(
        screen.getByTestId(`brain-note-${noTitle.id}-add-title`),
      );
      const input = screen.getByTestId(
        `brain-note-${noTitle.id}-title-input`,
      );
      await user.type(input, 'Via Enter{enter}');
      await waitFor(async () => {
        const fresh = await db.notes.get(noTitle.id);
        expect(fresh?.title).toBe('Via Enter');
      });
    });

    it('should revert the draft and exit edit mode when Escape is pressed in the title input', async () => {
      const noTitle: Note = { ...sampleNote, title: 'Original' };
      await db.notes.put(noTitle);
      const user = userEvent.setup();
      renderNote(noTitle);
      await user.click(screen.getByTestId(`brain-note-${noTitle.id}-title`));
      const input = screen.getByTestId(
        `brain-note-${noTitle.id}-title-input`,
      );
      await user.clear(input);
      await user.type(input, 'Discard{escape}');
      const fresh = await db.notes.get(noTitle.id);
      expect(fresh?.title).toBe('Original');
    });

    it('should not write to DB when saving a no-change title (commitTitle no-op)', async () => {
      const titled: Note = { ...sampleNote, title: 'Same' };
      await db.notes.put(titled);
      const user = userEvent.setup();
      const updateSpy = vi.spyOn(db.notes, 'update');
      renderNote(titled);
      await user.click(screen.getByTestId(`brain-note-${titled.id}-title`));
      const input = screen.getByTestId(
        `brain-note-${titled.id}-title-input`,
      );
      fireEvent.blur(input);
      expect(updateSpy).not.toHaveBeenCalled();
      updateSpy.mockRestore();
    });
  });

  describe('detail drawer', () => {
    it('should open the detail drawer when the ↗ icon is clicked', async () => {
      const user = userEvent.setup();
      renderNote();
      expect(useUI.getState().detailNoteId).toBeNull();
      await user.click(
        screen.getByTestId(`brain-note-${sampleNote.id}-open-details`),
      );
      expect(useUI.getState().detailNoteId).toBe(sampleNote.id);
    });

    it('should not open the detail drawer on a plain surface click', async () => {
      const user = userEvent.setup();
      renderNote();
      expect(useUI.getState().detailNoteId).toBeNull();
      // clicking the body enters edit mode, but should not open the drawer
      await user.click(screen.getByTestId(`brain-note-${sampleNote.id}-body`));
      expect(useUI.getState().detailNoteId).toBeNull();
    });
  });

  describe('context menu', () => {
    it('should show a context menu with Delete that removes the note', async () => {
      await db.notes.put(sampleNote);
      const user = userEvent.setup();
      renderNote();
      fireEvent.contextMenu(
        screen.getByTestId(`brain-note-${sampleNote.id}-body`),
      );
      const menuItem = await screen.findByTestId(
        'brain-note-context-menu-delete',
      );
      expect(menuItem).toHaveTextContent(/delete note/i);
      await user.click(menuItem);
      await waitFor(async () => {
        expect(await db.notes.get(sampleNote.id)).toBeUndefined();
      });
    });

    it('should close the context menu when Escape is pressed', async () => {
      await db.notes.put(sampleNote);
      renderNote();
      fireEvent.contextMenu(
        screen.getByTestId(`brain-note-${sampleNote.id}-body`),
      );
      await screen.findByTestId('brain-note-context-menu-delete');
      fireEvent.keyDown(document, { key: 'Escape' });
      await waitFor(() => {
        expect(
          screen.queryByTestId('brain-note-context-menu-delete'),
        ).not.toBeInTheDocument();
      });
    });

    it('should keep the context menu open when a non-Escape key is pressed', async () => {
      await db.notes.put(sampleNote);
      renderNote();
      fireEvent.contextMenu(
        screen.getByTestId(`brain-note-${sampleNote.id}-body`),
      );
      await screen.findByTestId('brain-note-context-menu-delete');
      fireEvent.keyDown(document, { key: 'a' });
      // Menu is still open
      expect(
        screen.queryByTestId('brain-note-context-menu-delete'),
      ).toBeInTheDocument();
    });

    it('should keep the context menu open when a pointerdown happens inside the menu itself', async () => {
      await db.notes.put(sampleNote);
      renderNote();
      fireEvent.contextMenu(
        screen.getByTestId(`brain-note-${sampleNote.id}-body`),
      );
      const menuItem = await screen.findByTestId(
        'brain-note-context-menu-delete',
      );
      // Pointerdown on a descendant of the menu (with the data attribute)
      // should NOT close the menu (the listener returns early).
      fireEvent.pointerDown(menuItem);
      expect(
        screen.queryByTestId('brain-note-context-menu-delete'),
      ).toBeInTheDocument();
    });

    it('should close the context menu when clicking outside it', async () => {
      await db.notes.put(sampleNote);
      renderNote();
      fireEvent.contextMenu(
        screen.getByTestId(`brain-note-${sampleNote.id}-body`),
      );
      await screen.findByTestId('brain-note-context-menu-delete');
      // simulate a pointerdown on document outside the menu
      fireEvent.pointerDown(document.body);
      await waitFor(() => {
        expect(
          screen.queryByTestId('brain-note-context-menu-delete'),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('doc link', () => {
    it('should render the doc-link icon when linkedDocId is set', async () => {
      await db.docs.put(sampleDoc);
      const linked = { ...sampleNote, linkedDocId: sampleDoc.id };
      renderNote(linked);
      expect(
        screen.getByTestId(`brain-note-${linked.id}-doc-link`),
      ).toHaveAttribute('aria-label', 'Open linked doc');
    });

    it('should not trigger onPick when the doc-link icon is clicked', async () => {
      const user = userEvent.setup();
      const onPick = vi.fn();
      const linked = { ...sampleNote, linkedDocId: sampleDoc.id };
      renderNote(linked, { onPick });
      await user.click(screen.getByTestId(`brain-note-${linked.id}-doc-link`));
      expect(onPick).not.toHaveBeenCalled();
    });

    it('should navigate to the linked doc via useNavigate when the doc-link button is clicked', async () => {
      await db.docs.put(sampleDoc);
      const linked = { ...sampleNote, linkedDocId: sampleDoc.id };
      const user = userEvent.setup();
      renderNote(linked);
      await user.click(screen.getByTestId(`brain-note-${linked.id}-doc-link`));
      expect(navigateSpy).toHaveBeenCalledWith(
        `/s/${sampleSpace.id}/d/${sampleDoc.id}`,
      );
    });
  });

  describe('seed states', () => {
    it('should not show the "(click to write)" placeholder for a Seed-prompt note', async () => {
      const seedPrompt: Note = {
        ...sampleNote,
        state: NoteState.SeedPrompt,
        body: '',
      };
      await db.notes.put(seedPrompt);
      renderNote(seedPrompt);
      const body = screen.getByTestId(`brain-note-${seedPrompt.id}-body`);
      // The placeholder text "(click to write)" should NOT be shown for seed prompts
      expect(body).not.toHaveTextContent('(click to write)');
      // The body wrapper still applies italic styling for seed prompts
      expect(body.className).toMatch(/italic/);
    });

    it('should render the Globe icon for a Seed-fetched note', async () => {
      const seedFetched: Note = {
        ...sampleNote,
        state: NoteState.SeedFetched,
        body: 'fetched',
      };
      await db.notes.put(seedFetched);
      renderNote(seedFetched);
      expect(
        screen.getByTestId(`brain-note-${seedFetched.id}-fetched-icon`),
      ).toHaveAttribute('aria-label', 'Fetched content');
    });
  });

  describe('drag and resize behaviour', () => {
    it('should persist the new position on drag-move and clamp to >= 0', async () => {
      await db.notes.put(sampleNote);
      renderNote();
      const surface = screen.getByTestId(`brain-note-${sampleNote.id}`);
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

    it('should update width and height on resize-handle pointerdown + drag, clamping to the max', async () => {
      await db.notes.put(sampleNote);
      renderNote();
      const handle = screen.getByTestId(
        `brain-note-${sampleNote.id}-resize-handle`,
      );
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

    it('should clamp width and height to the minimum bounds on resize', async () => {
      await db.notes.put(sampleNote);
      renderNote();
      const handle = screen.getByTestId(
        `brain-note-${sampleNote.id}-resize-handle`,
      );
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

    it('should not start a drag when a non-left mouse button is pressed on the surface', async () => {
      await db.notes.put(sampleNote);
      renderNote();
      const surface = screen.getByTestId(`brain-note-${sampleNote.id}`);
      const updateSpy = vi.spyOn(db.notes, 'update');
      fireEvent.pointerDown(surface, {
        button: 2,
        pointerId: 1,
        clientX: 0,
        clientY: 0,
      });
      fireEvent.pointerMove(surface, {
        pointerId: 1,
        clientX: 50,
        clientY: 50,
      });
      fireEvent.pointerUp(surface, { pointerId: 1 });
      expect(updateSpy).not.toHaveBeenCalled();
      updateSpy.mockRestore();
    });

    it('should trigger onPick but not begin a drag when shift-click on the surface occurs', async () => {
      await db.notes.put(sampleNote);
      const onPick = vi.fn();
      renderNote(sampleNote, { onPick });
      const surface = screen.getByTestId(`brain-note-${sampleNote.id}`);
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

    it('should ignore a pointermove with a mismatched pointerId mid-drag', async () => {
      await db.notes.put(sampleNote);
      renderNote();
      const surface = screen.getByTestId(`brain-note-${sampleNote.id}`);
      fireEvent.pointerDown(surface, {
        button: 0,
        pointerId: 1,
        clientX: 0,
        clientY: 0,
      });
      // unrelated pointer's move event arrives — should be ignored, then a
      // matching up event should still commit (with no movement so far).
      fireEvent.pointerMove(surface, {
        pointerId: 99,
        clientX: 200,
        clientY: 200,
      });
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

    it('should leave the drag state untouched when pointerup arrives with a mismatched pointerId', async () => {
      await db.notes.put(sampleNote);
      renderNote();
      const surface = screen.getByTestId(`brain-note-${sampleNote.id}`);
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

    it('should not start a drag when pointerdown originates from a [data-no-drag] descendant', async () => {
      await db.notes.put(sampleNote);
      renderNote();
      // the Open-details button is data-no-drag
      const updateSpy = vi.spyOn(db.notes, 'update');
      const button = screen.getByTestId(
        `brain-note-${sampleNote.id}-open-details`,
      );
      fireEvent.pointerDown(button, {
        button: 0,
        pointerId: 1,
        clientX: 10,
        clientY: 10,
      });
      fireEvent.pointerMove(button, {
        pointerId: 1,
        clientX: 200,
        clientY: 200,
      });
      fireEvent.pointerUp(button, { pointerId: 1 });
      expect(updateSpy).not.toHaveBeenCalled();
      updateSpy.mockRestore();
    });
  });

  describe('image attachments', () => {
    const pngFile = (name = 'pic.png') =>
      new File(['imgdata'], name, { type: 'image/png' });

    const seedAttachment = async (id: string, noteId = sampleNote.id) => {
      await db.noteAttachments.put({
        id,
        noteId,
        spaceId: sampleSpace.id,
        name: `${id}.png`,
        mime: 'image/png',
        size: 4,
        blob: new Blob(['x'], { type: 'image/png' }),
        createdAt: Date.now(),
      });
    };

    it('uploads a picture and shows it in the note image strip', async () => {
      const user = userEvent.setup();
      renderNote();
      const input = screen.getByTestId(`brain-note-${sampleNote.id}-image-input`);
      await user.upload(input, pngFile());

      await waitFor(() => {
        expect(screen.getByRole('img', { name: 'pic.png' })).toBeInTheDocument();
      });
      expect(
        await db.noteAttachments.where('noteId').equals(sampleNote.id).count(),
      ).toBe(1);
    });

    it('opens the file picker when the add-picture button is clicked', async () => {
      const user = userEvent.setup();
      renderNote();
      const input = screen.getByTestId(
        `brain-note-${sampleNote.id}-image-input`,
      ) as HTMLInputElement;
      const clickSpy = vi.fn();
      input.click = clickSpy;
      await user.click(
        screen.getByTestId(`brain-note-${sampleNote.id}-add-image`),
      );
      expect(clickSpy).toHaveBeenCalledOnce();
    });

    it('hides the add-picture button once the limit is reached', async () => {
      await seedAttachment('a1');
      await seedAttachment('a2');
      renderNote();
      await waitFor(() => {
        expect(
          screen.getByTestId(`brain-note-${sampleNote.id}-images`),
        ).toBeInTheDocument();
      });
      expect(
        screen.queryByTestId(`brain-note-${sampleNote.id}-add-image`),
      ).not.toBeInTheDocument();
    });

    it('removes a picture when its remove control is clicked', async () => {
      const user = userEvent.setup();
      await seedAttachment('a1');
      renderNote();
      await waitFor(() => {
        expect(
          screen.getByTestId(`brain-note-${sampleNote.id}-image-a1`),
        ).toBeInTheDocument();
      });
      await user.click(
        screen.getByTestId(`brain-note-${sampleNote.id}-image-a1-remove`),
      );
      await waitFor(async () => {
        expect(await db.noteAttachments.get('a1')).toBeUndefined();
      });
    });
  });

  describe('snapshot', () => {
    it('should match the snapshot across all variants', () => {
      const { container } = renderNote(
        { ...sampleNote, title: 'A title' },
        { selected: true, pending: true },
      );
      expect(container).toMatchSnapshot();
    });
  });
});
