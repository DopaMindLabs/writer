import userEvent from '@testing-library/user-event';
import { fireEvent, render, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import { sampleNote } from '@/test/fixtures';
import { NoteState, type Note } from '@/db/schema';
import { BrainSpaceNote } from './BrainSpaceNote';

describe('BrainSpaceNote', () => {
  it('renders default note', () => {
    const { container } = render(
      <BrainSpaceNote
        note={sampleNote}
        selected={false}
        pending={false}
        onPick={() => {}}
      />,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders selected and pending note with title', () => {
    const { container } = render(
      <BrainSpaceNote
        note={{ ...sampleNote, title: 'A title' }}
        selected
        pending
        onPick={() => {}}
      />,
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
    const { getByText } = render(
      <BrainSpaceNote
        note={seedNote}
        selected={false}
        pending={false}
        onPick={() => {}}
      />,
    );
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
    const { getByText, queryByRole } = render(
      <BrainSpaceNote
        note={sampleNote}
        selected={false}
        pending={false}
        onPick={() => {}}
      />,
    );
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
    const { getByText } = render(
      <BrainSpaceNote
        note={noTitle}
        selected={false}
        pending={false}
        onPick={() => {}}
      />,
    );
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

  it('delete button removes the note (and cascades connections)', async () => {
    await db.notes.put(sampleNote);
    const user = userEvent.setup();
    const { getByLabelText } = render(
      <BrainSpaceNote
        note={sampleNote}
        selected={false}
        pending={false}
        onPick={() => {}}
      />,
    );
    await user.click(getByLabelText('Delete note'));
    await waitFor(async () => {
      expect(await db.notes.get(sampleNote.id)).toBeUndefined();
    });
  });
});
