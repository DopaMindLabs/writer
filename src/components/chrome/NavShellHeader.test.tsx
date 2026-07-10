import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { sampleSpace } from '@/test/fixtures';
import { NavShellHeader } from './NavShellHeader';

describe('NavShellHeader', () => {
  it('renders the wordmark, default subtitle and home link in the global variant', () => {
    renderWithProviders(<NavShellHeader variant="global" space={null} />);
    expect(screen.getByText('LIpsum Writer')).toBeInTheDocument();
    expect(screen.getByText('UNIVERSAL SETTINGS')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
  });

  it('renders the space name, tag and subtitle in the space variant', () => {
    renderWithProviders(<NavShellHeader variant="space" space={sampleSpace} />);
    expect(screen.getByText(sampleSpace.name)).toBeInTheDocument();
    expect(screen.getByText(sampleSpace.tag)).toBeInTheDocument();
    expect(screen.getByText('SPACE SETTINGS')).toBeInTheDocument();
  });

  it('falls back to placeholders when the space has not loaded yet', () => {
    renderWithProviders(<NavShellHeader variant="space" space={null} />);
    expect(screen.getByText('…')).toBeInTheDocument();
    expect(screen.getByText('·')).toBeInTheDocument();
  });

  it('overrides the subtitle when a subtitleOverride is provided', () => {
    renderWithProviders(
      <NavShellHeader
        variant="global"
        space={null}
        subtitleOverride="Help / Documentation"
      />,
    );
    expect(screen.getByText('Help / Documentation')).toBeInTheDocument();
  });
});
