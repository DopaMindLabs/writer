import { renderWithProviders, screen } from '@/test/test-utils';
import { BrainSpaceLink } from './BrainSpaceLink';

describe('BrainSpaceLink', () => {
  it('links to the space brain-space route with its label', () => {
    renderWithProviders(
      <BrainSpaceLink spaceId="sp1" active={false} count={0} />,
    );
    const link = screen.getByTestId('sidebar-brain-space-link');
    expect(link).toHaveAttribute('href', '/s/sp1/brain-space');
    expect(
      screen.getByTestId('sidebar-brain-space-link-label'),
    ).toHaveTextContent('Brain space');
  });

  it('shows the note count when there are unsorted notes', () => {
    renderWithProviders(
      <BrainSpaceLink spaceId="sp1" active={false} count={3} />,
    );
    expect(
      screen.getByTestId('sidebar-brain-space-link-count'),
    ).toHaveTextContent('3◦');
  });

  it('shows the empty glyph when there are no notes', () => {
    renderWithProviders(
      <BrainSpaceLink spaceId="sp1" active={false} count={0} />,
    );
    expect(
      screen.getByTestId('sidebar-brain-space-link-count'),
    ).toHaveTextContent('◌');
  });

  it('reserves the trailing kebab gutter so the count aligns with document rows', () => {
    renderWithProviders(
      <BrainSpaceLink spaceId="sp1" active={false} count={0} />,
    );
    // pr-9 matches the doc/section rows' w-7 kebab + gap-2 column.
    expect(screen.getByTestId('sidebar-brain-space-link')).toHaveClass('pr-9');
  });

  it('marks itself active with the ink rule', () => {
    renderWithProviders(
      <BrainSpaceLink spaceId="sp1" active count={0} />,
    );
    expect(screen.getByTestId('sidebar-brain-space-link')).toHaveClass(
      'border-ink',
    );
  });
});
