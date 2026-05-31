import { renderWithProviders, screen } from '@/test/test-utils';
import { BlockQuote } from './block-quote';

describe('BlockQuote', () => {
  it('renders children inside a blockquote', () => {
    renderWithProviders(<BlockQuote>“to be or not”</BlockQuote>);
    const quote = screen.getByText(/to be or not/);
    expect(quote.tagName).toBe('BLOCKQUOTE');
  });

  it('renders the cite footer when cite is provided', () => {
    renderWithProviders(
      <BlockQuote cite="— Hamlet">main text</BlockQuote>,
    );
    expect(screen.getByText('main text')).toBeInTheDocument();
    expect(screen.getByText('— Hamlet')).toBeInTheDocument();
  });

  it('omits the cite footer when cite is missing', () => {
    const { container } = renderWithProviders(
      <BlockQuote>main text</BlockQuote>,
    );
    expect(container.querySelectorAll('div')).toHaveLength(0);
  });

  it('forwards className and ref', () => {
    const ref = { current: null as HTMLQuoteElement | null };
    renderWithProviders(
      <BlockQuote ref={ref} className="custom">
        hi
      </BlockQuote>,
    );
    expect(ref.current).not.toBeNull();
    expect(ref.current).toHaveClass('custom');
  });

  describe('snapshot', () => {
    it('should match the snapshot with and without a cite footer', () => {
      const { container } = renderWithProviders(
        <div>
          <BlockQuote>The unexamined life is not worth living.</BlockQuote>
          <BlockQuote cite="— Hamlet">To be, or not to be.</BlockQuote>
        </div>,
      );
      expect(container).toMatchSnapshot();
    });
  });
});
