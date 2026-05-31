import { renderWithProviders, screen } from '@/test/test-utils';
import { MobileSplitFallback } from './MobileSplitFallback';

describe('MobileSplitFallback', () => {
  it('renders the fallback container with title and body copy', () => {
    renderWithProviders(<MobileSplitFallback spaceId="s1" docId="d1" />, {
      initialEntries: ['/s/s1/d/d1/split'],
    });
    expect(screen.getByTestId('mobile-split-fallback')).toBeInTheDocument();
    expect(screen.getByText('Needs a larger screen')).toBeInTheDocument();
    expect(screen.getByText(/Split view sits two documents/i)).toBeInTheDocument();
  });

  it('links the CTA to the doc Write route', () => {
    renderWithProviders(<MobileSplitFallback spaceId="s1" docId="d1" />, {
      initialEntries: ['/s/s1/d/d1/split'],
    });
    expect(
      screen.getByRole('link', { name: /open in write/i }),
    ).toHaveAttribute('href', '/s/s1/d/d1');
  });

  it('computes the Write href from the provided space and doc ids', () => {
    renderWithProviders(<MobileSplitFallback spaceId="s2" docId="d9" />, {
      initialEntries: ['/s/s2/d/d9/split'],
    });
    expect(
      screen.getByRole('link', { name: /open in write/i }),
    ).toHaveAttribute('href', '/s/s2/d/d9');
  });
});

describe('snapshot', () => {
  it('matches the rendered fallback', () => {
    const { container } = renderWithProviders(
      <MobileSplitFallback spaceId="s1" docId="d1" />,
      { initialEntries: ['/s/s1/d/d1/split'] },
    );
    expect(container).toMatchSnapshot();
  });
});
