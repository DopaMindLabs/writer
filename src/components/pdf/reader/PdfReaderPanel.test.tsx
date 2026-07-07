import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { PdfReaderPanel } from './PdfReaderPanel';

describe('PdfReaderPanel', () => {
  it('renders the title, count and body', () => {
    renderWithProviders(
      <PdfReaderPanel title="Highlights & notes" count={3}>
        <p>body</p>
      </PdfReaderPanel>,
    );
    const panel = screen.getByTestId('pdf-reader-panel');
    expect(panel).toHaveAttribute('aria-label', 'Highlights & notes');
    expect(panel).toHaveTextContent('Highlights & notes');
    expect(panel).toHaveTextContent('3');
    expect(screen.getByText('body')).toBeInTheDocument();
  });

  it('omits the count when it is not supplied', () => {
    renderWithProviders(
      <PdfReaderPanel title="Document info">
        <p>rows</p>
      </PdfReaderPanel>,
    );
    expect(screen.getByTestId('pdf-reader-panel')).toHaveTextContent('Document info');
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('renders a footer slot when given', () => {
    renderWithProviders(
      <PdfReaderPanel title="Highlights & notes" footerSlot={<button>add</button>}>
        <p>body</p>
      </PdfReaderPanel>,
    );
    expect(screen.getByRole('button', { name: 'add' })).toBeInTheDocument();
  });
});
