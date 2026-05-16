import userEvent from '@testing-library/user-event';
import { act, fireEvent } from '@testing-library/react';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import { sampleDoc, sampleSpace } from '@/test/fixtures';
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

  it('double-click on the doc-name button enables editing and Enter persists the new name', async () => {
    await db.spaces.put(sampleSpace);
    await db.docs.put({ ...sampleDoc, name: 'Original' });
    const user = userEvent.setup();
    renderWithProviders(
      <Topbar
        spaceId="s1"
        docId="d1"
        docName="Original"
        spaceName="Test"
        mode="write"
      />,
      { initialEntries: ['/s/s1/d/d1'] },
    );
    const docButton = screen.getByRole('button', { name: /original/i });
    await user.dblClick(docButton);
    const input = await screen.findByLabelText(/rename doc/i);
    await user.clear(input);
    await user.type(input, 'Renamed{enter}');
    await waitFor(async () => {
      const fresh = await db.docs.get('d1');
      expect(fresh?.name).toBe('Renamed');
    });
  });

  it('Escape during doc rename reverts the draft and exits edit mode without persisting', async () => {
    await db.spaces.put(sampleSpace);
    await db.docs.put({ ...sampleDoc, name: 'Original' });
    const user = userEvent.setup();
    const updateSpy = vi.spyOn(db.docs, 'update');
    renderWithProviders(
      <Topbar
        spaceId="s1"
        docId="d1"
        docName="Original"
        spaceName="Test"
        mode="write"
      />,
      { initialEntries: ['/s/s1/d/d1'] },
    );
    await user.dblClick(screen.getByRole('button', { name: /original/i }));
    const input = await screen.findByLabelText(/rename doc/i);
    await user.clear(input);
    await user.type(input, 'Discard{escape}');
    await waitFor(() =>
      expect(screen.queryByLabelText(/rename doc/i)).not.toBeInTheDocument(),
    );
    expect(updateSpy).not.toHaveBeenCalled();
    updateSpy.mockRestore();
  });

  it('blurring with an empty or unchanged doc name does not write to the DB', async () => {
    await db.spaces.put(sampleSpace);
    await db.docs.put({ ...sampleDoc, name: 'Same' });
    const user = userEvent.setup();
    const updateSpy = vi.spyOn(db.docs, 'update');
    renderWithProviders(
      <Topbar
        spaceId="s1"
        docId="d1"
        docName="Same"
        spaceName="Test"
        mode="write"
      />,
      { initialEntries: ['/s/s1/d/d1'] },
    );
    // unchanged: enter and immediately blur with the same value
    await user.dblClick(screen.getByRole('button', { name: /same/i }));
    const input = await screen.findByLabelText(/rename doc/i);
    fireEvent.blur(input);
    expect(updateSpy).not.toHaveBeenCalled();
    // empty: enter and clear, then blur
    await user.dblClick(screen.getByRole('button', { name: /same/i }));
    const input2 = await screen.findByLabelText(/rename doc/i);
    await user.clear(input2);
    fireEvent.blur(input2);
    expect(updateSpy).not.toHaveBeenCalled();
    updateSpy.mockRestore();
  });

  it('disables the doc-name button when docId is null (cannot enter edit mode)', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Topbar
        spaceId="s1"
        docId={null}
        docName="Sample"
        spaceName="Test"
        mode="write"
      />,
      { initialEntries: ['/s/s1'] },
    );
    const button = screen.getByRole('button', { name: /sample/i });
    expect(button).toBeDisabled();
    // double-click should be a no-op — no input shows up
    await user.dblClick(button);
    expect(screen.queryByLabelText(/rename doc/i)).not.toBeInTheDocument();
  });

  it('hides the FocusToggle when on /citations or when mode is not dump and there is no docId', () => {
    // /citations: no FocusToggle even with docId
    const { rerender } = renderWithProviders(
      <Topbar
        spaceId="s1"
        docId="d1"
        docName="Sample"
        spaceName="Test"
        mode="write"
      />,
      { initialEntries: ['/s/s1/citations'] },
    );
    expect(
      screen.queryByRole('link', { name: /focus mode/i }),
    ).not.toBeInTheDocument();
    // mode=write with docId=null: FocusToggle hidden
    rerender(
      <Topbar
        spaceId="s1"
        docId={null}
        spaceName="Test"
        mode="write"
      />,
    );
    expect(
      screen.queryByRole('link', { name: /focus mode/i }),
    ).not.toBeInTheDocument();
  });

  it('shows the FocusToggle when mode is dump even without a docId', () => {
    renderWithProviders(
      <Topbar spaceId="s1" docId={null} spaceName="Test" mode="dump" />,
      { initialEntries: ['/s/s1/dump'] },
    );
    // FocusToggle renders as a Link with an aria-label like "Focus mode"
    expect(
      screen.getByRole('link', { name: /focus mode/i }),
    ).toBeInTheDocument();
  });
});
