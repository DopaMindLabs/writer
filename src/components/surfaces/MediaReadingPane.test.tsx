import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { db } from '@/db/db';
import { NoteKind, NoteState, type Note } from '@/db/schema';
import { useUI } from '@/store/ui';
import { MediaReadingPane } from './MediaReadingPane';

const note = (overrides: Partial<Note>): Note => ({
  id: 'n1',
  spaceId: 's1',
  l: 0,
  t: 0,
  w: 1,
  h: 1,
  kind: NoteKind.Pdf,
  state: NoteState.User,
  body: '',
  createdAt: 0,
  ...overrides,
});

describe('MediaReadingPane', () => {
  it('renders nothing when no reading pane is open', () => {
    renderWithProviders(<MediaReadingPane />);
    expect(screen.queryByTestId('media-reading-pane')).not.toBeInTheDocument();
  });

  it('renders a url-sourced PDF from the cache', async () => {
    await db.notes.add(note({ id: 'n1', pdfUrl: 'https://arxiv.org/pdf/1706.03762.pdf' }));
    await db.noteUrlCache.put({
      noteId: 'n1',
      url: 'https://arxiv.org/pdf/1706.03762.pdf',
      mime: 'application/pdf',
      size: 1,
      blob: new Blob(['%PDF']),
      pageCount: 8,
      fetchedAt: 0,
    });
    useUI.getState().openMediaReadingPaneForNote('n1');

    renderWithProviders(<MediaReadingPane />);
    await waitFor(() => {
      expect(screen.getByTestId('media-reading-pane-title')).toHaveTextContent(
        '1706.03762.pdf',
      );
    });
  });

  it('renders a library-sourced PDF from the media item', async () => {
    await db.media.put({
      id: 'm1',
      spaceId: 's1',
      name: 'library.pdf',
      mime: 'application/pdf',
      size: 1,
      blob: new Blob(['%PDF']),
      pageCount: 3,
      createdAt: 0,
      updatedAt: 0,
    });
    await db.notes.add(note({ id: 'n1', mediaItemId: 'm1' }));
    useUI.getState().openMediaReadingPaneForNote('n1');

    renderWithProviders(<MediaReadingPane />);
    await waitFor(() => {
      expect(screen.getByTestId('media-reading-pane-title')).toHaveTextContent(
        'library.pdf',
      );
    });
  });
});
