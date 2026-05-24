import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { renderAtRoute, screen, waitFor } from '@/test/test-utils';
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

const seedTwoConnectedNotes = async () => {
  await db.spaces.put(sampleSpace);
  await db.notes.bulkPut([sampleNote, SECOND_NOTE]);
  await db.connections.put(CONNECTION);
};

const renderCanvas = () => {
  return renderAtRoute(<BrainSpaceCanvas spaceId={sampleSpace.id} />, {
    path: '/s/:spaceId',
    initialEntries: [`/s/${sampleSpace.id}`],
  });
};

afterEach(() => {
  useUI.getState().closeDetail();
  useUI.getState().focusNote(null);
  navigateSpy.mockClear();
});

describe('BrainSpaceDetailDrawer', () => {
  describe('rendering', () => {
    it('should render the drawer with the note title input populated', async () => {
      await seedTwoConnectedNotes();
      renderCanvas();
      await screen.findByTestId('brain-note-n2');
      useUI.getState().openDetail(SECOND_NOTE.id);
      const drawer = await screen.findByTestId('brain-detail-drawer');
      expect(drawer).toBeInTheDocument();
      const title = screen.getByTestId(
        'brain-detail-drawer-title',
      ) as HTMLInputElement;
      expect(title.value).toBe('Hero');
      expect(
        screen.getByTestId('brain-detail-drawer-body'),
      ).toBeInTheDocument();
    });

    it('should render the incoming/outgoing connection count in the heading', async () => {
      await seedTwoConnectedNotes();
      renderCanvas();
      await screen.findByTestId('brain-note-n2');
      useUI.getState().openDetail(SECOND_NOTE.id);
      const heading = await screen.findByTestId(
        'brain-detail-drawer-connections-heading',
      );
      expect(heading).toHaveTextContent(/Connections \(1\)/);
    });

    it('should show the empty-connections hint when a note has no connections', async () => {
      await db.spaces.put(sampleSpace);
      const lonely: Note = { ...sampleNote, id: 'n-lonely', title: 'Lonely' };
      await db.notes.put(lonely);
      renderCanvas();
      useUI.getState().openDetail(lonely.id);
      const empty = await screen.findByTestId(
        'brain-detail-drawer-connections-empty',
      );
      expect(empty).toHaveTextContent(
        /shift-click another note on the canvas to connect/i,
      );
    });
  });

  describe('body editing', () => {
    it('should write body changes back to Dexie on blur', async () => {
      await seedTwoConnectedNotes();
      const user = userEvent.setup();
      renderCanvas();
      await screen.findByTestId('brain-note-n2');
      useUI.getState().openDetail(SECOND_NOTE.id);
      const body = (await screen.findByTestId(
        'brain-detail-drawer-body',
      )) as HTMLTextAreaElement;
      await user.clear(body);
      await user.type(body, 'updated body');
      body.blur();
      await waitFor(async () => {
        const fresh = await db.notes.get(SECOND_NOTE.id);
        expect(fresh?.body).toBe('updated body');
      });
    });

    it('should not write to Dexie when blurring an unchanged body', async () => {
      await seedTwoConnectedNotes();
      const updateSpy = vi.spyOn(db.notes, 'update');
      renderCanvas();
      await screen.findByTestId('brain-note-n2');
      useUI.getState().openDetail(SECOND_NOTE.id);
      const body = (await screen.findByTestId(
        'brain-detail-drawer-body',
      )) as HTMLTextAreaElement;
      fireEvent.blur(body);
      expect(updateSpy).not.toHaveBeenCalled();
      updateSpy.mockRestore();
    });
  });

  describe('title editing', () => {
    it('should commit the rename via blur when Enter is pressed', async () => {
      await seedTwoConnectedNotes();
      const user = userEvent.setup();
      renderCanvas();
      await screen.findByTestId('brain-note-n2');
      useUI.getState().openDetail(SECOND_NOTE.id);
      const title = (await screen.findByTestId(
        'brain-detail-drawer-title',
      )) as HTMLInputElement;
      await user.clear(title);
      await user.type(title, 'Heroine{enter}');
      await waitFor(async () => {
        const fresh = await db.notes.get(SECOND_NOTE.id);
        expect(fresh?.title).toBe('Heroine');
      });
    });

    it('should persist undefined when the title is cleared', async () => {
      await seedTwoConnectedNotes();
      const user = userEvent.setup();
      renderCanvas();
      await screen.findByTestId('brain-note-n2');
      useUI.getState().openDetail(SECOND_NOTE.id);
      const title = (await screen.findByTestId(
        'brain-detail-drawer-title',
      )) as HTMLInputElement;
      await user.clear(title);
      title.blur();
      await waitFor(async () => {
        const fresh = await db.notes.get(SECOND_NOTE.id);
        expect(fresh?.title).toBeUndefined();
      });
    });

    it('should not write to Dexie when blurring an unchanged title', async () => {
      await seedTwoConnectedNotes();
      const updateSpy = vi.spyOn(db.notes, 'update');
      renderCanvas();
      await screen.findByTestId('brain-note-n2');
      useUI.getState().openDetail(SECOND_NOTE.id);
      const title = (await screen.findByTestId(
        'brain-detail-drawer-title',
      )) as HTMLInputElement;
      fireEvent.blur(title);
      expect(updateSpy).not.toHaveBeenCalled();
      updateSpy.mockRestore();
    });
  });

  describe('linked doc', () => {
    it('should persist linkedDocId when a doc is chosen', async () => {
      await seedTwoConnectedNotes();
      await db.docs.put(sampleDoc);
      const user = userEvent.setup();
      renderCanvas();
      await screen.findByTestId('brain-note-n2');
      useUI.getState().openDetail(SECOND_NOTE.id);
      const select = (await screen.findByTestId(
        'brain-detail-drawer-linked-doc',
      )) as HTMLSelectElement;
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

    it('should clear linkedDocId when "— No linked doc —" is selected', async () => {
      await seedTwoConnectedNotes();
      await db.docs.put(sampleDoc);
      const user = userEvent.setup();
      renderCanvas();
      await screen.findByTestId('brain-note-n2');
      useUI.getState().openDetail(SECOND_NOTE.id);
      const select = (await screen.findByTestId(
        'brain-detail-drawer-linked-doc',
      )) as HTMLSelectElement;
      await waitFor(() =>
        expect(
          Array.from(select.options).some((o) => o.value === sampleDoc.id),
        ).toBe(true),
      );
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

    it('should label linked-doc options with "Untitled" when the doc name is empty', async () => {
      await seedTwoConnectedNotes();
      await db.docs.put({ ...sampleDoc, name: '' });
      renderCanvas();
      await screen.findByTestId('brain-note-n2');
      useUI.getState().openDetail(SECOND_NOTE.id);
      const select = (await screen.findByTestId(
        'brain-detail-drawer-linked-doc',
      )) as HTMLSelectElement;
      await waitFor(() => {
        const option = Array.from(select.options).find(
          (o) => o.value === sampleDoc.id,
        );
        expect(option?.textContent).toBe('Untitled');
      });
    });

    it('should render an Open button that closes the drawer when clicked', async () => {
      await db.spaces.put(sampleSpace);
      await db.docs.put(sampleDoc);
      await db.notes.bulkPut([
        sampleNote,
        { ...SECOND_NOTE, linkedDocId: sampleDoc.id },
      ]);
      const user = userEvent.setup();
      renderCanvas();
      await screen.findByTestId('brain-note-n2');
      useUI.getState().openDetail(SECOND_NOTE.id);
      const open = await screen.findByTestId('brain-detail-drawer-open');
      expect(open).toHaveTextContent(/open/i);
      await user.click(open);
      await waitFor(() => expect(useUI.getState().detailNoteId).toBeNull());
    });

    it('should navigate to the linked doc via useNavigate when Open is clicked', async () => {
      await db.spaces.put(sampleSpace);
      await db.docs.put(sampleDoc);
      await db.notes.bulkPut([
        sampleNote,
        { ...SECOND_NOTE, linkedDocId: sampleDoc.id },
      ]);
      const user = userEvent.setup();
      renderCanvas();
      await screen.findByTestId('brain-note-n2');
      useUI.getState().openDetail(SECOND_NOTE.id);
      const openBtn = await screen.findByTestId(
        'brain-detail-drawer-open',
        {},
        { timeout: 5000 },
      );
      await user.click(openBtn);
      await waitFor(() =>
        expect(navigateSpy).toHaveBeenCalledWith(
          `/s/${sampleSpace.id}/d/${sampleDoc.id}`,
        ),
      );
    });
  });

  describe('connections list', () => {
    it('should remove a connection when its row delete button is clicked', async () => {
      await seedTwoConnectedNotes();
      const user = userEvent.setup();
      renderCanvas();
      await screen.findByTestId('brain-note-n2');
      useUI.getState().openDetail(SECOND_NOTE.id);
      const removeBtn = await screen.findByTestId(
        `brain-detail-drawer-connection-${CONNECTION.id}-remove`,
      );
      await user.click(removeBtn);
      await waitFor(async () => {
        expect(await db.connections.get(CONNECTION.id)).toBeUndefined();
      });
    });

    it('should delete an outgoing connection from the source note\'s drawer', async () => {
      await seedTwoConnectedNotes();
      const user = userEvent.setup();
      renderCanvas();
      await screen.findByTestId('brain-note-n2');
      useUI.getState().openDetail(sampleNote.id);
      const removeBtn = await screen.findByTestId(
        `brain-detail-drawer-connection-${CONNECTION.id}-remove`,
      );
      await user.click(removeBtn);
      await waitFor(async () => {
        expect(await db.connections.get(CONNECTION.id)).toBeUndefined();
      });
    });

    it('should focus and open the related note when a connection row is clicked', async () => {
      await seedTwoConnectedNotes();
      const user = userEvent.setup();
      renderCanvas();
      await screen.findByTestId('brain-note-n2');
      useUI.getState().openDetail(sampleNote.id);
      const row = await screen.findByTestId(
        `brain-detail-drawer-connection-${CONNECTION.id}-focus`,
      );
      expect(row).toHaveTextContent(/→/);
      await waitFor(() => expect(row).toHaveTextContent(/Hero/i));
      await user.click(row);
      await waitFor(() => {
        expect(useUI.getState().detailNoteId).toBe(SECOND_NOTE.id);
        expect(useUI.getState().focusedNoteId).toBe(SECOND_NOTE.id);
      });
    });

    it('should disable the focus button on an orphaned connection whose target is gone', async () => {
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
      renderCanvas();
      useUI.getState().openDetail(sampleNote.id);
      const row = await screen.findByTestId(
        `brain-detail-drawer-connection-${orphan.id}-focus`,
      );
      expect(row).toHaveTextContent(/\(untitled\)/i);
      expect(row).toBeDisabled();
    });
  });

  describe('delete note', () => {
    it('should cascade-delete the note and close the drawer when Delete note is clicked', async () => {
      await seedTwoConnectedNotes();
      const user = userEvent.setup();
      renderCanvas();
      await screen.findByTestId('brain-note-n2');
      useUI.getState().openDetail(SECOND_NOTE.id);
      const del = await screen.findByTestId('brain-detail-drawer-delete');
      expect(del).toHaveTextContent(/delete note/i);
      await user.click(del);
      await waitFor(async () => {
        expect(await db.notes.get(SECOND_NOTE.id)).toBeUndefined();
        expect(useUI.getState().detailNoteId).toBeNull();
      });
    });
  });

  describe('keyboard', () => {
    it('should call closeDetail when Escape is pressed inside the drawer', async () => {
      await seedTwoConnectedNotes();
      renderCanvas();
      await screen.findByTestId('brain-note-n2');
      useUI.getState().openDetail(SECOND_NOTE.id);
      const title = await screen.findByTestId('brain-detail-drawer-title');
      title.focus();
      fireEvent.keyDown(title, { key: 'Escape' });
      await waitFor(() => expect(useUI.getState().detailNoteId).toBeNull());
    });
  });
});
