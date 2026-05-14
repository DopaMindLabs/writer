import userEvent from '@testing-library/user-event';
import { renderAtRoute, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import { useUI } from '@/store/ui';
import { sampleDoc, sampleNote, sampleSpace } from '@/test/fixtures';
import type { Connection, Note } from '@/db/schema';
import { BrainSpaceCanvas } from './BrainSpaceCanvas';

const SECOND_NOTE: Note = {
  ...sampleNote,
  id: 'n2',
  title: 'Hero',
  body: 'tall, broody',
  l: 240,
  t: 120,
};

const CONNECTION: Connection = {
  id: 'c1',
  spaceId: sampleSpace.id,
  fromNoteId: sampleNote.id,
  toNoteId: SECOND_NOTE.id,
  createdAt: 0,
};

async function seedTwoConnectedNotes() {
  await db.spaces.put(sampleSpace);
  await db.notes.bulkPut([sampleNote, SECOND_NOTE]);
  await db.connections.put(CONNECTION);
}

function renderCanvas() {
  return renderAtRoute(<BrainSpaceCanvas spaceId={sampleSpace.id} />, {
    path: '/s/:spaceId',
    initialEntries: [`/s/${sampleSpace.id}`],
  });
}

afterEach(() => {
  useUI.getState().closeDetail();
  useUI.getState().focusNote(null);
});

describe('BrainSpaceDetailDrawer', () => {
  it('opens when openDetail is called and shows the note body', async () => {
    await seedTwoConnectedNotes();
    const { findByText, findByLabelText } = renderCanvas();
    await findByText('Hero');
    useUI.getState().openDetail(SECOND_NOTE.id);
    const titleInput = await findByLabelText('Note title');
    expect((titleInput as HTMLInputElement).value).toBe('Hero');
    expect(await findByText('Body')).toBeInTheDocument();
  });

  it('lists incoming and outgoing connections', async () => {
    await seedTwoConnectedNotes();
    const { findByText, findByRole } = renderCanvas();
    await findByText('Hero');
    useUI.getState().openDetail(SECOND_NOTE.id);
    const heading = await findByRole('heading', { name: /connections/i });
    expect(heading.textContent).toMatch(/Connections \(1\)/);
  });

  it('writes body changes back to Dexie on blur', async () => {
    await seedTwoConnectedNotes();
    const user = userEvent.setup();
    const { findByText, findByLabelText } = renderCanvas();
    await findByText('Hero');
    useUI.getState().openDetail(SECOND_NOTE.id);
    const body = (await findByLabelText('Body')) as HTMLTextAreaElement;
    await user.clear(body);
    await user.type(body, 'updated body');
    body.blur();
    await waitFor(async () => {
      const fresh = await db.notes.get(SECOND_NOTE.id);
      expect(fresh?.body).toBe('updated body');
    });
  });

  it('persists linkedDocId when a doc is chosen', async () => {
    await seedTwoConnectedNotes();
    await db.docs.put(sampleDoc);
    const user = userEvent.setup();
    const { findByText, findByLabelText } = renderCanvas();
    await findByText('Hero');
    useUI.getState().openDetail(SECOND_NOTE.id);
    const select = (await findByLabelText(/linked doc/i)) as HTMLSelectElement;
    await user.selectOptions(select, sampleDoc.id);
    await waitFor(async () => {
      const fresh = await db.notes.get(SECOND_NOTE.id);
      expect(fresh?.linkedDocId).toBe(sampleDoc.id);
    });
  });

  it('removes a connection when its row delete button is clicked', async () => {
    await seedTwoConnectedNotes();
    const user = userEvent.setup();
    const { findByText, findAllByLabelText } = renderCanvas();
    await findByText('Hero');
    useUI.getState().openDetail(SECOND_NOTE.id);
    const removeButtons = await findAllByLabelText('Remove connection');
    await user.click(removeButtons[0]);
    await waitFor(async () => {
      expect(await db.connections.get(CONNECTION.id)).toBeUndefined();
    });
  });

  it('Enter on the title input commits the rename via blur', async () => {
    await seedTwoConnectedNotes();
    const user = userEvent.setup();
    const { findByText, findByLabelText } = renderCanvas();
    await findByText('Hero');
    useUI.getState().openDetail(SECOND_NOTE.id);
    const title = (await findByLabelText('Note title')) as HTMLInputElement;
    await user.clear(title);
    await user.type(title, 'Heroine{enter}');
    await waitFor(async () => {
      const fresh = await db.notes.get(SECOND_NOTE.id);
      expect(fresh?.title).toBe('Heroine');
    });
  });

  it('clearing the title persists undefined (no title)', async () => {
    await seedTwoConnectedNotes();
    const user = userEvent.setup();
    const { findByText, findByLabelText } = renderCanvas();
    await findByText('Hero');
    useUI.getState().openDetail(SECOND_NOTE.id);
    const title = (await findByLabelText('Note title')) as HTMLInputElement;
    await user.clear(title);
    title.blur();
    await waitFor(async () => {
      const fresh = await db.notes.get(SECOND_NOTE.id);
      expect(fresh?.title).toBeUndefined();
    });
  });

  it('clicking Delete note cascades and closes the drawer', async () => {
    await seedTwoConnectedNotes();
    const user = userEvent.setup();
    const { findByText, findByRole } = renderCanvas();
    await findByText('Hero');
    useUI.getState().openDetail(SECOND_NOTE.id);
    await user.click(
      await findByRole('button', { name: /delete note/i }),
    );
    await waitFor(async () => {
      expect(await db.notes.get(SECOND_NOTE.id)).toBeUndefined();
      expect(useUI.getState().detailNoteId).toBeNull();
    });
  });

  it('shows an Open button when a doc is linked and clicking it closes the drawer', async () => {
    await db.spaces.put(sampleSpace);
    await db.docs.put(sampleDoc);
    await db.notes.bulkPut([
      sampleNote,
      { ...SECOND_NOTE, linkedDocId: sampleDoc.id },
    ]);
    const user = userEvent.setup();
    const { findByText, findByRole } = renderCanvas();
    await findByText('Hero');
    useUI.getState().openDetail(SECOND_NOTE.id);
    const open = await findByRole('button', { name: /^open$/i });
    await user.click(open);
    await waitFor(() =>
      expect(useUI.getState().detailNoteId).toBeNull(),
    );
  });

});
