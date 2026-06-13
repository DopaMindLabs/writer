import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { PdfCardThumbnail } from './PdfCardThumbnail';

describe('PdfCardThumbnail', () => {
  it('renders the name, page count and a thumbnail frame', () => {
    renderWithProviders(
      <PdfCardThumbnail
        noteId="n1"
        name="1706.03762.pdf"
        blob={new Blob(['%PDF'], { type: 'application/pdf' })}
        pageCount={8}
      />,
    );
    const meta = screen.getByTestId('brain-note-n1-pdf-meta');
    expect(meta).toHaveTextContent('PDF');
    expect(meta).toHaveTextContent('1706.03762.pdf');
    expect(meta).toHaveTextContent('8 pages');
    const thumb = screen.getByTestId('brain-note-n1-pdf-thumb');
    fireEvent.pointerDown(thumb);
    expect(thumb).toBeInTheDocument();
  });
});
