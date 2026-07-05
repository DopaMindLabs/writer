import { renderWithProviders, screen } from '@/test/test-utils';
import { MediaLibraryLink } from './MediaLibraryLink';

describe('MediaLibraryLink', () => {
  it('links to the space library route', () => {
    renderWithProviders(<MediaLibraryLink spaceId="s1" active={false} />);
    expect(screen.getByTestId('sidebar-media-library-link')).toHaveAttribute(
      'href',
      '/s/s1/library',
    );
  });

  it('marks the current route with aria-current', () => {
    renderWithProviders(<MediaLibraryLink spaceId="s1" active />);
    expect(screen.getByTestId('sidebar-media-library-link')).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('does not mark aria-current when it is not the current route', () => {
    renderWithProviders(<MediaLibraryLink spaceId="s1" active={false} />);
    expect(
      screen.getByTestId('sidebar-media-library-link'),
    ).not.toHaveAttribute('aria-current');
  });
});
