import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { PdfCardError } from './PdfCardError';

describe('PdfCardError', () => {
  it('shows the failure message in an error banner', () => {
    renderWithProviders(
      <PdfCardError
        noteId="n1"
        url="https://x.test/a.pdf"
        message="The PDF host blocks cross-origin requests."
        busy={false}
        onResubmit={vi.fn()}
      />,
    );
    expect(screen.getByTestId('brain-note-n1-pdf-error')).toHaveTextContent(
      'The PDF host blocks cross-origin requests.',
    );
  });

  it('resubmits the edited url on retry', () => {
    const onResubmit = vi.fn();
    renderWithProviders(
      <PdfCardError
        noteId="n1"
        url="https://x.test/a.pdf"
        message="failed"
        busy={false}
        onResubmit={onResubmit}
      />,
    );
    const field = screen.getByTestId('brain-note-n1-pdf-url-retry-field');
    fireEvent.change(field, { target: { value: 'https://y.test/b.pdf' } });
    fireEvent.click(screen.getByTestId('brain-note-n1-pdf-url-retry-submit'));
    expect(onResubmit).toHaveBeenCalledWith('https://y.test/b.pdf');
  });
});
