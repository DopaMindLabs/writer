import { renderWithProviders, screen } from '@/test/test-utils';
import { PageNav } from './PageNav';

describe('PageNav', () => {
  describe('rendering', () => {
    it('should render a back link by default when showBack is true', () => {
      renderWithProviders(<PageNav />);
      const back = screen.getByTestId('page-nav-back');
      expect(back).toBeInTheDocument();
      expect(back).toHaveTextContent(/back/i);
    });

    it('should hide the back link when showBack=false', () => {
      renderWithProviders(<PageNav showBack={false} />);
      expect(screen.queryByTestId('page-nav-back')).not.toBeInTheDocument();
    });

    it('should render primary nav links: home, about, settings, github', () => {
      renderWithProviders(<PageNav />, { initialEntries: ['/about'] });
      expect(screen.getByTestId('page-nav-nav-home')).toHaveAttribute(
        'href',
        '/',
      );
      expect(screen.getByTestId('page-nav-nav-about')).toHaveAttribute(
        'href',
        '/about',
      );
      expect(screen.getByTestId('page-nav-nav-settings')).toHaveAttribute(
        'href',
        '/settings',
      );
      const github = screen.getByTestId('page-nav-nav-github');
      expect(github).toHaveAttribute(
        'href',
        'https://github.com/DopaMindLabs/Writer',
      );
      expect(github).toHaveAttribute('target', '_blank');
      expect(github).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('active state', () => {
    it('should mark the active nav link as text-ink and the rest as text-ink-3', () => {
      renderWithProviders(<PageNav />, { initialEntries: ['/about'] });
      expect(screen.getByTestId('page-nav-nav-about')).toHaveClass('text-ink');
      expect(screen.getByTestId('page-nav-nav-home')).toHaveClass('text-ink-3');
    });
  });

  describe('custom backTo', () => {
    it('should use a custom backTo when provided', () => {
      renderWithProviders(<PageNav backTo="/settings" />);
      expect(screen.getByTestId('page-nav-back')).toHaveAttribute(
        'href',
        '/settings',
      );
    });
  });

  describe('snapshot', () => {
    it('should match the snapshot across all variants', () => {
      const { container: defaultNav } = renderWithProviders(<PageNav />, {
        initialEntries: ['/'],
      });
      expect(defaultNav).toMatchSnapshot('default');

      const { container: noBack } = renderWithProviders(
        <PageNav showBack={false} />,
        { initialEntries: ['/about'] },
      );
      expect(noBack).toMatchSnapshot('no-back, active=/about');
    });
  });
});
