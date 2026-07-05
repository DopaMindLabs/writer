import { renderWithProviders, screen } from '@/test/test-utils';
import { WorkshopLinks } from './WorkshopLinks';

describe('WorkshopLinks', () => {
  it('renders both the brain-space and media library links', () => {
    renderWithProviders(
      <WorkshopLinks
        spaceId="s1"
        onBrainSpace={false}
        onMediaLibrary={false}
        notesCount={3}
      />,
    );
    expect(screen.getByTestId('sidebar-brain-space-link')).toHaveAttribute(
      'href',
      '/s/s1/brain-space',
    );
    expect(screen.getByTestId('sidebar-media-library-link')).toHaveAttribute(
      'href',
      '/s/s1/library',
    );
  });

  it('passes the note count to the brain-space link', () => {
    renderWithProviders(
      <WorkshopLinks
        spaceId="s1"
        onBrainSpace={false}
        onMediaLibrary={false}
        notesCount={7}
      />,
    );
    expect(
      screen.getByTestId('sidebar-brain-space-link-count'),
    ).toHaveTextContent('7');
  });

  it('marks only the active destination', () => {
    renderWithProviders(
      <WorkshopLinks
        spaceId="s1"
        onBrainSpace={false}
        onMediaLibrary
        notesCount={0}
      />,
    );
    expect(screen.getByTestId('sidebar-media-library-link')).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      screen.getByTestId('sidebar-brain-space-link'),
    ).not.toHaveAttribute('aria-current');
  });
});
