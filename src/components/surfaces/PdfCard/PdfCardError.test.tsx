import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { PdfCardError } from './PdfCardError';

describe('PdfCardError', () => {
  it('shows the failure message in an error banner', () => {
    renderWithProviders(
      <PdfCardError
        noteId="n1"
        message="The PDF host blocks cross-origin requests."
        onEdit={vi.fn()}
      />,
    );
    expect(screen.getByTestId('brain-note-n1-pdf-error')).toHaveTextContent(
      'The PDF host blocks cross-origin requests.',
    );
  });

  it('invokes the edit-source action', () => {
    const onEdit = vi.fn();
    renderWithProviders(
      <PdfCardError noteId="n1" message="failed" onEdit={onEdit} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Edit source' }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});
