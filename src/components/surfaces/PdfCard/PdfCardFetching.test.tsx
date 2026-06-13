import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { PdfCardFetching } from './PdfCardFetching';

describe('PdfCardFetching', () => {
  it('renders a polite status region', () => {
    renderWithProviders(<PdfCardFetching noteId="n1" />);
    const status = screen.getByTestId('brain-note-n1-pdf-loading');
    expect(status).toHaveAttribute('role', 'status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('fetching PDF…');
  });
});
