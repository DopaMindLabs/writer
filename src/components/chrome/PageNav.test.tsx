import { renderWithProviders, screen } from '@/test/test-utils';
import { PageNav } from './PageNav';

describe('PageNav', () => {
  it('renders a back link by default when showBack is true', () => {
    renderWithProviders(<PageNav />);
    expect(screen.getByRole('link', { name: /back/i })).toBeInTheDocument();
  });

  it('hides the back link when showBack=false', () => {
    renderWithProviders(<PageNav showBack={false} />);
    expect(screen.queryByRole('link', { name: /back/i })).not.toBeInTheDocument();
  });

  it('renders primary nav links: home, about, settings, github', () => {
    renderWithProviders(<PageNav />, { initialEntries: ['/about'] });
    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /about/i })).toHaveAttribute(
      'href',
      '/about',
    );
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute(
      'href',
      '/settings',
    );
    const github = screen.getByRole('link', { name: /github/i });
    expect(github).toHaveAttribute('href', 'https://github.com/DopaMindLabs/Writer');
    expect(github).toHaveAttribute('target', '_blank');
    expect(github).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('marks the active nav link as text-ink', () => {
    renderWithProviders(<PageNav />, { initialEntries: ['/about'] });
    expect(screen.getByRole('link', { name: /about/i })).toHaveClass('text-ink');
    expect(screen.getByRole('link', { name: /home/i })).toHaveClass('text-ink-3');
  });
});
