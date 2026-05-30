import { render, screen } from '@/test/test-utils';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders the caption', () => {
    render(<EmptyState caption="No syncs yet." />);
    expect(screen.getByText('No syncs yet.')).toBeInTheDocument();
  });

  it('renders an optional title heading', () => {
    render(<EmptyState title="Not supported" caption="Use a Chromium browser." />);
    const heading = screen.getByRole('heading', { name: 'Not supported' });
    expect(heading.tagName).toBe('H3');
    expect(screen.getByText('Use a Chromium browser.')).toBeInTheDocument();
  });

  it('omits the heading when no title is given', () => {
    render(<EmptyState caption="Nothing here." />);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('merges a custom className', () => {
    const { container } = render(<EmptyState caption="x" className="mt-0" />);
    expect(container.firstChild).toHaveClass('mt-0', 'border-dashed');
  });
});
