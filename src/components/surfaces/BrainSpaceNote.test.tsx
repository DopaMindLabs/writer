import userEvent from '@testing-library/user-event';
import { fireEvent, renderAtRoute, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import { useUI } from '@/store/ui';
import { sampleDoc, sampleNote, sampleSpace } from '@/test/fixtures';
import { NoteState, type Note } from '@/db/schema';
import { BrainSpaceNote } from './BrainSpaceNote';

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
});
