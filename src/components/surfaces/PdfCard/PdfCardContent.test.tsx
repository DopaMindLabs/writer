import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { db } from '@/db/db';
import { NoteKind, NoteState, type Note } from '@/db/schema';
import { PdfCardContent } from './PdfCardContent';

const note = (overrides: Partial<Note> = {}): Note => ({
  id: 'n1',
  spaceId: 's1',
  l: 0,
  t: 0,
  w: 240,
  h: 220,
  kind: NoteKind.Pdf,
  state: NoteState.User,
  body: '',
  createdAt: 0,
  ...overrides,
});

describe('PdfCardContent', () => {
  it('shows the empty affordance and opens the picker', async () => {
    renderWithProviders(<PdfCardContent note={note()} />);
    fireEvent.click(screen.getByTestId('brain-note-n1-pdf-empty'));
    await waitFor(() => {
      expect(screen.getByTestId('media-picker-dialog')).toBeInTheDocument();
    });
  });

  it('renders a library-sourced PDF as a thumbnail with its name', async () => {
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
    renderWithProviders(<PdfCardContent note={note({ mediaItemId: 'm1' })} />);
    await waitFor(() => {
      expect(screen.getByTestId('brain-note-n1-pdf-thumb')).toBeInTheDocument();
    });
    expect(screen.getByTestId('brain-note-n1-pdf-meta')).toHaveTextContent(
      'library.pdf',
    );
    // Library source has no refresh affordance.
    expect(screen.queryByTestId('brain-note-n1-refresh')).not.toBeInTheDocument();
  });
});
