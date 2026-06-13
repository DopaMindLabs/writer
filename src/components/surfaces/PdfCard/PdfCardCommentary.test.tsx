import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { db } from '@/db/db';
import { NoteKind, NoteState, type Note } from '@/db/schema';
import { PdfCardCommentary } from './PdfCardCommentary';

const note = (overrides: Partial<Note> = {}): Note => ({
  id: 'n1',
  spaceId: 's1',
  l: 0,
  t: 0,
  w: 100,
  h: 60,
  kind: NoteKind.Pdf,
  state: NoteState.SeedPrompt,
  body: 'methods section',
  createdAt: 0,
  ...overrides,
});

describe('PdfCardCommentary', () => {
  it('renders the note body', () => {
    renderWithProviders(<PdfCardCommentary note={note()} />);
    expect(screen.getByTestId('brain-note-n1-body')).toHaveTextContent(
      'methods section',
    );
  });

  it('edits and persists the commentary on blur, promoting state to user', async () => {
    await db.notes.add(note());
    renderWithProviders(<PdfCardCommentary note={note()} />);

    fireEvent.click(screen.getByTestId('brain-note-n1-body'));
    const input = screen.getByTestId('brain-note-n1-body-input');
    fireEvent.change(input, { target: { value: 'ε-greedy is the bit' } });
    fireEvent.blur(input);

    await waitFor(async () => {
      const stored = await db.notes.get('n1');
      expect(stored?.body).toBe('ε-greedy is the bit');
      expect(stored?.state).toBe(NoteState.User);
    });
  });
});
