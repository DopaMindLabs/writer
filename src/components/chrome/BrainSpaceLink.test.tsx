import { renderWithProviders, screen } from '@/test/test-utils';
import { BrainSpaceLink } from './BrainSpaceLink';

describe('BrainSpaceLink', () => {
  it('links to the space brain-space route', () => {
    renderWithProviders(
      <BrainSpaceLink spaceId="s1" active={false} count={0} />,
    );
    expect(screen.getByTestId('sidebar-brain-space-link')).toHaveAttribute(
      'href',
      '/s/s1/brain-space',
    );
  });

  it('renders the note count when notes exist', () => {
    renderWithProviders(
      <BrainSpaceLink spaceId="s1" active={false} count={4} />,
    );
    expect(
      screen.getByTestId('sidebar-brain-space-link-count'),
    ).toHaveTextContent('4');
  });

  it('renders the empty glyph when there are no notes', () => {
    renderWithProviders(
      <BrainSpaceLink spaceId="s1" active={false} count={0} />,
    );
    expect(
      screen.getByTestId('sidebar-brain-space-link-count'),
    ).toHaveTextContent('◌');
  });

  it('marks the link as active with the active styling', () => {
    renderWithProviders(<BrainSpaceLink spaceId="s1" active count={2} />);
    expect(screen.getByTestId('sidebar-brain-space-link')).toHaveClass(
      'border-ink',
    );
  });
});
