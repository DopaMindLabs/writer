import { renderWithProviders, screen } from '@/test/test-utils';
import { WorkshopFallback } from './WorkshopFallback';

describe('WorkshopFallback', () => {
  it('labels the fallback section "Workshop"', () => {
    renderWithProviders(
      <WorkshopFallback spaceId="sp1" onBrainSpace={false} notesCount={0} />,
    );
    expect(screen.getByTestId('sidebar-workshop-fallback')).toBeInTheDocument();
    expect(
      screen.getByTestId('sidebar-workshop-fallback-label'),
    ).toHaveTextContent('Workshop');
  });

  it('renders a brain-space link pointing at the given space', () => {
    renderWithProviders(
      <WorkshopFallback spaceId="sp1" onBrainSpace={false} notesCount={0} />,
    );
    expect(screen.getByTestId('sidebar-brain-space-link')).toHaveAttribute(
      'href',
      '/s/sp1/brain-space',
    );
  });

  it('forwards the notes count to the brain-space link', () => {
    renderWithProviders(
      <WorkshopFallback spaceId="sp1" onBrainSpace={false} notesCount={4} />,
    );
    expect(
      screen.getByTestId('sidebar-brain-space-link-count'),
    ).toHaveTextContent('4◦');
  });

  it('shows the empty glyph on the link when there are no notes', () => {
    renderWithProviders(
      <WorkshopFallback spaceId="sp1" onBrainSpace={false} notesCount={0} />,
    );
    expect(
      screen.getByTestId('sidebar-brain-space-link-count'),
    ).toHaveTextContent('◌');
  });

  it('marks the brain-space link active when on the brain space', () => {
    renderWithProviders(
      <WorkshopFallback spaceId="sp1" onBrainSpace notesCount={0} />,
    );
    expect(screen.getByTestId('sidebar-brain-space-link')).toHaveClass(
      'border-ink',
    );
  });

  it('leaves the brain-space link inactive when not on the brain space', () => {
    renderWithProviders(
      <WorkshopFallback spaceId="sp1" onBrainSpace={false} notesCount={0} />,
    );
    expect(screen.getByTestId('sidebar-brain-space-link')).not.toHaveClass(
      'border-ink',
    );
  });
});
