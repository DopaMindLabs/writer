import { act } from '@testing-library/react';
import { renderWithProviders, screen } from '@/test/test-utils';
import { useUI } from '@/store/ui';
import { MobileMoreSheet } from './MobileMoreSheet';

describe('MobileMoreSheet', () => {
  beforeEach(() => {
    act(() => {
      useUI.getState().setMobileMoreOpen(false);
    });
  });

  it('does not render content when closed', () => {
    renderWithProviders(<MobileMoreSheet spaceId="s1" docId="d1" />, {
      initialEntries: ['/s/s1/d/d1'],
    });
    expect(screen.queryByTestId('mobile-more-sheet')).not.toBeInTheDocument();
  });

  it('renders mode buttons and menu items when open with spaceId+docId', () => {
    act(() => {
      useUI.getState().setMobileMoreOpen(true);
    });
    renderWithProviders(<MobileMoreSheet spaceId="s1" docId="d1" />, {
      initialEntries: ['/s/s1/d/d1'],
    });
    expect(screen.getByTestId('mobile-more-sheet')).toBeInTheDocument();
    // Write mode link is rendered (has computed href).
    expect(
      screen.getByRole('link', { name: /write/i }).getAttribute('href'),
    ).toBe('/s/s1/d/d1');
    // Read and Split links also wired up.
    expect(
      screen.getByRole('link', { name: /read/i }).getAttribute('href'),
    ).toBe('/s/s1/d/d1/read');
    expect(
      screen.getByRole('link', { name: /split/i }).getAttribute('href'),
    ).toBe('/s/s1/d/d1/split');
    // Menu items: space settings + about + help/whatsNew/feedback ComingSoon entries.
    expect(
      screen.getByRole('link', { name: /space settings/i }),
    ).toHaveAttribute('href', '/s/s1/settings');
    expect(screen.getByRole('link', { name: /about/i })).toHaveAttribute(
      'href',
      '/about',
    );
  });

  it('falls back to ComingSoon mode chips when there is no docId (read/split disabled)', () => {
    act(() => {
      useUI.getState().setMobileMoreOpen(true);
    });
    renderWithProviders(<MobileMoreSheet spaceId="s1" docId={null} />, {
      initialEntries: ['/s/s1'],
    });
    // Read & Split have no href so they fall through to the ComingSoon span.
    expect(
      screen.queryByRole('link', { name: /^read$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /^split$/i }),
    ).not.toBeInTheDocument();
    // The write link should still resolve to the space-only path.
    expect(
      screen.getByRole('link', { name: /^write$/i }).getAttribute('href'),
    ).toBe('/s/s1');
  });

  it('marks the read mode chip active when route ends with /read', () => {
    act(() => {
      useUI.getState().setMobileMoreOpen(true);
    });
    renderWithProviders(<MobileMoreSheet spaceId="s1" docId="d1" />, {
      initialEntries: ['/s/s1/d/d1/read'],
    });
    expect(
      screen.getByRole('link', { name: /read/i }).className,
    ).toContain('bg-ink');
  });

  it('marks the split mode chip active when route ends with /split', () => {
    act(() => {
      useUI.getState().setMobileMoreOpen(true);
    });
    renderWithProviders(<MobileMoreSheet spaceId="s1" docId="d1" />, {
      initialEntries: ['/s/s1/d/d1/split'],
    });
    expect(
      screen.getByRole('link', { name: /split/i }).className,
    ).toContain('bg-ink');
  });

  it('preserves the ?focus=1 query when computing the write href in focus mode', () => {
    act(() => {
      useUI.getState().setMobileMoreOpen(true);
    });
    renderWithProviders(<MobileMoreSheet spaceId="s1" docId="d1" />, {
      initialEntries: ['/s/s1/d/d1?focus=1'],
    });
    expect(
      screen.getByRole('link', { name: /write/i }).getAttribute('href'),
    ).toBe('/s/s1/d/d1?focus=1');
  });
});
