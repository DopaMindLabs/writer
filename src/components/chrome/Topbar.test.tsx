import userEvent from '@testing-library/user-event';
import { act } from '@testing-library/react';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { useUI } from '@/store/ui';
import { Topbar } from './Topbar';

describe('Topbar', () => {
  it('renders with doc name, mode tabs and theme toggle', () => {
    const { container } = renderWithProviders(
      <Topbar
        spaceId="s1"
        docId="d1"
        docName="Sample"
        spaceName="Test"
        mode="write"
      />,
      { initialEntries: ['/s/s1/d/d1'] },
    );
    expect(container).toMatchSnapshot();
  });

  it('renders citations view (no mode tabs, no focus toggle)', () => {
    const { container } = renderWithProviders(
      <Topbar
        spaceId="s1"
        docId={null}
        spaceName="Test"
        mode="write"
      />,
      { initialEntries: ['/s/s1/citations'] },
    );
    expect(container).toMatchSnapshot();
  });

  it('collapses to icon-only chrome when focus=1', () => {
    const { container } = renderWithProviders(
      <Topbar
        spaceId="s1"
        docId="d1"
        docName="Sample"
        spaceName="Test"
        mode="focus"
      />,
      { initialEntries: ['/s/s1/d/d1?focus=1'] },
    );
    expect(container).toMatchSnapshot();
  });

  it('opens the citations drawer when the citations button is clicked', async () => {
    renderWithProviders(
      <Topbar spaceId="s1" docId="d1" docName="Sample" mode="write" />,
      { initialEntries: ['/s/s1/d/d1'] },
    );
    expect(useUI.getState().citationsDrawerOpen).toBe(false);
    await userEvent.click(
      screen.getAllByRole('button', { name: /citations/i })[0],
    );
    expect(useUI.getState().citationsDrawerOpen).toBe(true);
  });

  it('opens the mobile nav drawer when the menu button is clicked', async () => {
    renderWithProviders(
      <Topbar spaceId="s1" docId="d1" docName="Sample" mode="write" />,
      { initialEntries: ['/s/s1/d/d1'] },
    );
    await userEvent.click(screen.getByRole('button', { name: /open nav/i }));
    expect(useUI.getState().mobileNavOpen).toBe(true);
  });

  it('renders Contrast icon when theme is high-contrast', async () => {
    act(() => useUI.getState().setTheme('hc-light'));
    const { container } = renderWithProviders(
      <Topbar spaceId="s1" docId="d1" docName="Sample" mode="write" />,
      { initialEntries: ['/s/s1/d/d1'] },
    );
    await waitFor(() => {
      expect(container.querySelector('svg.lucide-contrast')).not.toBeNull();
    });
  });

  it('renders Moon icon when theme is dark', async () => {
    act(() => useUI.getState().setTheme('dark'));
    const { container } = renderWithProviders(
      <Topbar spaceId="s1" docId="d1" docName="Sample" mode="write" />,
      { initialEntries: ['/s/s1/d/d1'] },
    );
    await waitFor(() => {
      expect(container.querySelector('svg.lucide-moon')).not.toBeNull();
    });
  });

  it('renders the focus-mode citations Link variant on /citations?focus=1', () => {
    renderWithProviders(
      <Topbar spaceId="s1" docId={null} spaceName="Test" mode="focus" />,
      { initialEntries: ['/s/s1/citations?focus=1'] },
    );
    // On the citations route, the citations affordance is a Link (not a
    // button) pointing to the citations route itself.
    const link = screen.getByRole('link', { name: /citations/i });
    expect(link).toHaveAttribute('href', '/s/s1/citations');
  });

  it('lets the user switch themes via the theme dropdown', async () => {
    renderWithProviders(
      <Topbar spaceId="s1" docId="d1" docName="Sample" mode="write" />,
      { initialEntries: ['/s/s1/d/d1'] },
    );
    await userEvent.click(
      screen.getByRole('button', { name: /^theme$/i }),
    );
    const darkItem = await screen.findByRole('menuitem', { name: /dark$/i });
    await userEvent.click(darkItem);
    await waitFor(() => expect(useUI.getState().theme).toBe('dark'));
  });
});
