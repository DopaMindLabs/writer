import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { renderAtRoute, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import { useUI } from '@/store/ui';
import { sampleDoc, sampleNote, sampleSpace } from '@/test/fixtures';
import type { Connection, Note } from '@/db/schema';
import { BrainSpaceCanvas } from './BrainSpaceCanvas';

const navigateSpy = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateSpy,
  };
});

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
  navigateSpy.mockClear();
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
    // Wait for the docs liveQuery to resolve and add the option for sampleDoc
    await waitFor(() =>
      expect(
        Array.from(select.options).some((o) => o.value === sampleDoc.id),
      ).toBe(true),
    );
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

  it('clicking Open navigates to the linked doc via useNavigate', async () => {
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
    // The Open button only renders once the docs useLiveQuery resolves
    // sampleDoc. Wait with a generous timeout to avoid flakes under load.
    const openBtn = await findByRole(
      'button',
      { name: /^open$/i },
      { timeout: 5000 },
    );
    await user.click(openBtn);
    await waitFor(() =>
      expect(navigateSpy).toHaveBeenCalledWith(
        `/s/${sampleSpace.id}/d/${sampleDoc.id}`,
      ),
    );
  });

  it('selecting "— No linked doc —" clears linkedDocId on the note', async () => {
    await seedTwoConnectedNotes();
    await db.docs.put(sampleDoc);
    const user = userEvent.setup();
    const { findByText, findByLabelText } = renderCanvas();
    await findByText('Hero');
    useUI.getState().openDetail(SECOND_NOTE.id);
    const select = (await findByLabelText(/linked doc/i)) as HTMLSelectElement;
    // First wait until the live-queried docs option for sampleDoc is in the DOM.
    await waitFor(() =>
      expect(
        Array.from(select.options).some((o) => o.value === sampleDoc.id),
      ).toBe(true),
    );
    // Link the doc → then clear it; both branches of handleLinkDoc execute.
    await user.selectOptions(select, sampleDoc.id);
    await waitFor(async () => {
      const r = await db.notes.get(SECOND_NOTE.id);
      expect(r?.linkedDocId).toBe(sampleDoc.id);
    });
    fireEvent.change(select, { target: { value: '' } });
    await waitFor(async () => {
      const r = await db.notes.get(SECOND_NOTE.id);
      expect(r?.linkedDocId == null).toBe(true);
    });
  });

  it('blurring an unchanged title does not write to Dexie', async () => {
    await seedTwoConnectedNotes();
    const updateSpy = vi.spyOn(db.notes, 'update');
    const { findByText, findByLabelText } = renderCanvas();
    await findByText('Hero');
    useUI.getState().openDetail(SECOND_NOTE.id);
    const title = (await findByLabelText('Note title')) as HTMLInputElement;
    fireEvent.blur(title);
    expect(updateSpy).not.toHaveBeenCalled();
    updateSpy.mockRestore();
  });

  it('blurring an unchanged body does not write to Dexie', async () => {
    await seedTwoConnectedNotes();
    const updateSpy = vi.spyOn(db.notes, 'update');
    const { findByText, findByLabelText } = renderCanvas();
    await findByText('Hero');
    useUI.getState().openDetail(SECOND_NOTE.id);
    const body = (await findByLabelText('Body')) as HTMLTextAreaElement;
    fireEvent.blur(body);
    expect(updateSpy).not.toHaveBeenCalled();
    updateSpy.mockRestore();
  });

  it('shows the empty-connections message when a note has no connections', async () => {
    await db.spaces.put(sampleSpace);
    const lonely: Note = { ...sampleNote, id: 'n-lonely', title: 'Lonely' };
    await db.notes.put(lonely);
    const { findByText } = renderCanvas();
    useUI.getState().openDetail(lonely.id);
    expect(
      await findByText(/shift-click another note on the canvas to connect/i),
    ).toBeInTheDocument();
  });

  it('pressing Escape inside the drawer triggers onOpenChange→closeDetail', async () => {
    await seedTwoConnectedNotes();
    const { findByText, findByLabelText } = renderCanvas();
    await findByText('Hero');
    useUI.getState().openDetail(SECOND_NOTE.id);
    // Focus an element inside the drawer so Radix's Escape handler fires on the
    // dialog content (which is what calls onOpenChange).
    const title = await findByLabelText('Note title');
    title.focus();
    fireEvent.keyDown(title, { key: 'Escape' });
    await waitFor(() => expect(useUI.getState().detailNoteId).toBeNull());
  });

  it('uses "Untitled" as the option label for a linked doc whose name is empty', async () => {
    await seedTwoConnectedNotes();
    await db.docs.put({ ...sampleDoc, name: '' });
    const { findByText, findByLabelText } = renderCanvas();
    await findByText('Hero');
    useUI.getState().openDetail(SECOND_NOTE.id);
    const select = (await findByLabelText(/linked doc/i)) as HTMLSelectElement;
    await waitFor(() => {
      const option = Array.from(select.options).find(
        (o) => o.value === sampleDoc.id,
      );
      expect(option?.textContent).toBe('Untitled');
    });
  });

  it('removing an outgoing connection from the source note\'s drawer deletes it from Dexie', async () => {
    await seedTwoConnectedNotes();
    const user = userEvent.setup();
    const { findByText, findAllByLabelText } = renderCanvas();
    await findByText('Hero');
    // Open detail for the SOURCE note (sampleNote → SECOND_NOTE); its
    // outgoing-row's Remove button exercises the outgoing-side onDelete branch.
    useUI.getState().openDetail(sampleNote.id);
    const removeButtons = await findAllByLabelText('Remove connection');
    await user.click(removeButtons[0]);
    await waitFor(async () => {
      expect(await db.connections.get(CONNECTION.id)).toBeUndefined();
    });
  });

  it('clicking a connection row\'s name area focuses + opens the related note', async () => {
    await seedTwoConnectedNotes();
    const user = userEvent.setup();
    const { findByText, findByRole } = renderCanvas();
    await findByText('Hero');
    useUI.getState().openDetail(sampleNote.id);
    // The row for the outgoing connection points to "Hero".
    const row = await findByRole('button', { name: /^→.*Hero/i });
    await user.click(row);
    await waitFor(() => {
      expect(useUI.getState().detailNoteId).toBe(SECOND_NOTE.id);
      expect(useUI.getState().focusedNoteId).toBe(SECOND_NOTE.id);
    });
  });

  it('renders a disabled focus button on an orphaned ConnectionRow whose target is gone', async () => {
    // Seed a note + a connection pointing at a non-existent target note. The
    // related-notes liveQuery will return only the existing endpoint, so the
    // outgoing ConnectionRow gets `note={undefined}` and disables itself.
    await db.spaces.put(sampleSpace);
    await db.notes.put({ ...sampleNote, title: 'Origin' });
    const orphan: Connection = {
      id: 'c-orphan',
      spaceId: sampleSpace.id,
      fromNoteId: sampleNote.id,
      toNoteId: 'never-existed',
      createdAt: 0,
    };
    await db.connections.put(orphan);
    const { findByRole } = renderCanvas();
    useUI.getState().openDetail(sampleNote.id);
    // The "(untitled)" label is the fallback for a missing note
    const row = await findByRole('button', { name: /^→.*\(untitled\)/i });
    expect(row).toBeDisabled();
  });
});
