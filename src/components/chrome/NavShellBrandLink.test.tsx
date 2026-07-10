import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { sampleSpace } from '@/test/fixtures';
import { routes } from '@/lib/routes';
import { NavShellBrandLink } from './NavShellBrandLink';

describe('NavShellBrandLink', () => {
  it('links the wordmark back to Home in the global variant', () => {
    renderWithProviders(<NavShellBrandLink isSpace={false} space={null} />);
    const home = screen.getByRole('link', { name: 'Home' });
    expect(home).toHaveAttribute('href', routes.home());
    expect(home).toHaveTextContent('L');
    expect(home).not.toHaveAttribute('aria-hidden');
  });

  it('links the tag badge back to the space Write view in the space variant', () => {
    renderWithProviders(
      <NavShellBrandLink isSpace space={sampleSpace} />,
    );
    const link = screen.getByRole('link', {
      name: `Open ${sampleSpace.name}`,
    });
    expect(link).toHaveAttribute('href', routes.spaceWrite(sampleSpace.id));
    expect(link).toHaveTextContent(sampleSpace.tag);
  });

  it('stays decorative with no destination while a space is loading', () => {
    renderWithProviders(<NavShellBrandLink isSpace space={null} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('·')).toBeInTheDocument();
  });
});
