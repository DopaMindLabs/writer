import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { useUI } from '@/store/ui';
import { seedBasicSpace } from '@/test/fixtures';
import { MobileMoreSheet } from './MobileMoreSheet';

describe('MobileMoreSheet', () => {
  beforeEach(() => {
    act(() => {
      useUI.getState().setMobileMoreOpen(false);
      useUI.getState().setMobileInspectorOpen(false);
    });
  });

  it('does not render content when closed', () => {
    renderWithProviders(<MobileMoreSheet spaceId="s1" docId="d1" />, {
      initialEntries: ['/s/s1/d/d1'],
    });
    expect(screen.queryByTestId('mobile-more-sheet')).not.toBeInTheDocument();
  });

  it('renders menu items when open with spaceId+docId', () => {
    act(() => {
      useUI.getState().setMobileMoreOpen(true);
    });
    renderWithProviders(<MobileMoreSheet spaceId="s1" docId="d1" />, {
      initialEntries: ['/s/s1/d/d1'],
    });
    expect(screen.getByTestId('mobile-more-sheet')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /space settings/i }),
    ).toHaveAttribute('href', '/s/s1/settings');
    expect(screen.getByRole('link', { name: /about/i })).toHaveAttribute(
      'href',
      '/about',
    );
    expect(
      screen.getByRole('link', { name: /help & shortcuts/i }),
    ).toHaveAttribute('href', '/help');
  });

  it('shows the Doc inspector item only when a doc is active', () => {
    act(() => {
      useUI.getState().setMobileMoreOpen(true);
    });
    const { unmount } = renderWithProviders(
      <MobileMoreSheet spaceId="s1" docId="d1" />,
      { initialEntries: ['/s/s1/d/d1'] },
    );
    expect(screen.getByTestId('mobile-more-inspector')).toHaveTextContent(
      'Doc inspector',
    );
    unmount();

    act(() => {
      useUI.getState().setMobileMoreOpen(true);
    });
    renderWithProviders(<MobileMoreSheet spaceId="s1" docId={null} />, {
      initialEntries: ['/s/s1'],
    });
    expect(
      screen.queryByTestId('mobile-more-inspector'),
    ).not.toBeInTheDocument();
  });

  it('opens the mobile inspector drawer from the Doc inspector item', async () => {
    await seedBasicSpace();
    act(() => {
      useUI.getState().setMobileMoreOpen(true);
    });
    renderWithProviders(<MobileMoreSheet spaceId="s1" docId="d1" />, {
      initialEntries: ['/s/s1/d/d1'],
    });
    await userEvent.click(screen.getByTestId('mobile-more-inspector'));
    expect(useUI.getState().mobileInspectorOpen).toBe(true);
    expect(useUI.getState().mobileMoreOpen).toBe(false);
    const drawer = await screen.findByTestId('mobile-inspector-drawer');
    expect(drawer).toBeInTheDocument();
    expect(screen.getByTestId('doc-inspector-name')).toHaveTextContent(
      'Sample Doc',
    );
  });
});

describe('snapshot', () => {
  beforeEach(() => {
    act(() => {
      useUI.getState().setMobileMoreOpen(false);
      useUI.getState().setMobileInspectorOpen(false);
    });
  });

  it('matches the open sheet with an active doc', () => {
    act(() => {
      useUI.getState().setMobileMoreOpen(true);
    });
    renderWithProviders(<MobileMoreSheet spaceId="s1" docId="d1" />, {
      initialEntries: ['/s/s1/d/d1'],
    });
    expect(screen.getByTestId('mobile-more-sheet')).toMatchSnapshot();
  });

  it('matches the space-level sheet with no active doc', () => {
    act(() => {
      useUI.getState().setMobileMoreOpen(true);
    });
    renderWithProviders(<MobileMoreSheet spaceId="s1" docId={null} />, {
      initialEntries: ['/s/s1'],
    });
    expect(screen.getByTestId('mobile-more-sheet')).toMatchSnapshot();
  });
});
