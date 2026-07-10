import userEvent from '@testing-library/user-event';
import { act, fireEvent } from '@testing-library/react';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import { sampleDoc, sampleSpace } from '@/test/fixtures';
import { useUI } from '@/store/ui';
import { Topbar } from './Topbar';

describe('Topbar', () => {
  beforeEach(() => {
    act(() => {
      useUI.getState().setInspectorMode('none');
      useUI.getState().closeCitationsDrawer();
    });
  });

  describe('rendering', () => {
    it('should render the open-nav button, doc-name button, citations trigger, and inspector toggle in write mode', () => {
      renderWithProviders(
        <Topbar
          spaceId="s1"
          docId="d1"
          docName="Sample"
          spaceName="Test"
          mode="write"
        />,
        { initialEntries: ['/s/s1/d/d1'] },
      );
      expect(screen.getByTestId('topbar')).toBeInTheDocument();
      expect(screen.getByTestId('topbar-open-nav')).toHaveAttribute(
        'aria-label',
        expect.stringMatching(/open nav/i),
      );
      expect(screen.getByTestId('topbar-doc-name')).toHaveTextContent('Sample');
      // Long doc names must ellipsise rather than wrap the 40px topbar.
      expect(screen.getByTestId('topbar-doc-name')).toHaveClass(
        'min-w-0',
        'truncate',
      );
      expect(screen.getByTestId('topbar-citations')).toHaveAttribute(
        'aria-label',
        expect.stringMatching(/citations/i),
      );
      expect(screen.getByTestId('topbar-inspector-toggle')).toHaveAttribute(
        'aria-label',
        expect.stringMatching(/inspector/i),
      );
    });

    it('should not render the inspector toggle on the citations route', () => {
      renderWithProviders(
        <Topbar spaceId="s1" docId={null} spaceName="Test" mode="write" />,
        { initialEntries: ['/s/s1/citations'] },
      );
      expect(
        screen.queryByTestId('topbar-inspector-toggle'),
      ).not.toBeInTheDocument();
    });

    it('should collapse to icon-only chrome when focus=1 (no inspector toggle)', () => {
      renderWithProviders(
        <Topbar
          spaceId="s1"
          docId="d1"
          docName="Sample"
          spaceName="Test"
          mode="focus"
        />,
        { initialEntries: ['/s/s1/d/d1?focus=1'] },
      );
      expect(
        screen.queryByTestId('topbar-inspector-toggle'),
      ).not.toBeInTheDocument();
    });

    it('should not render a standalone theme button', () => {
      renderWithProviders(
        <Topbar spaceId="s1" docId="d1" docName="Sample" mode="write" />,
        { initialEntries: ['/s/s1/d/d1'] },
      );
      expect(screen.queryByTestId('topbar-theme')).not.toBeInTheDocument();
    });

    it('should not render a standalone help menu', () => {
      renderWithProviders(
        <Topbar spaceId="s1" docId="d1" docName="Sample" mode="write" />,
        { initialEntries: ['/s/s1/d/d1'] },
      );
      expect(screen.queryByTestId('topbar-help')).not.toBeInTheDocument();
    });
  });

  describe('citations trigger', () => {
    it('should open the citations drawer when clicked', async () => {
      renderWithProviders(
        <Topbar spaceId="s1" docId="d1" docName="Sample" mode="write" />,
        { initialEntries: ['/s/s1/d/d1'] },
      );
      expect(useUI.getState().citationsDrawerOpen).toBe(false);
      await userEvent.click(screen.getByTestId('topbar-citations'));
      expect(useUI.getState().citationsDrawerOpen).toBe(true);
    });

    it('should render as a link to /s/:spaceId/citations when on /citations in focus mode', () => {
      renderWithProviders(
        <Topbar spaceId="s1" docId={null} spaceName="Test" mode="focus" />,
        { initialEntries: ['/s/s1/citations?focus=1'] },
      );
      const link = screen.getByTestId('topbar-citations');
      expect(link.tagName).toBe('A');
      expect(link).toHaveAttribute('href', '/s/s1/citations');
    });
  });

  describe('mobile nav', () => {
    it('should open the mobile nav drawer when the menu button is clicked', async () => {
      renderWithProviders(
        <Topbar spaceId="s1" docId="d1" docName="Sample" mode="write" />,
        { initialEntries: ['/s/s1/d/d1'] },
      );
      await userEvent.click(screen.getByTestId('topbar-open-nav'));
      expect(useUI.getState().mobileNavOpen).toBe(true);
    });
  });

  describe('inspector toggle', () => {
    it('should cycle through none → icons → expanded → none on click', async () => {
      renderWithProviders(
        <Topbar spaceId="s1" docId="d1" docName="Sample" mode="write" />,
        { initialEntries: ['/s/s1/d/d1'] },
      );
      expect(useUI.getState().inspectorMode).toBe('none');
      const toggle = screen.getByTestId('topbar-inspector-toggle');
      await userEvent.click(toggle);
      expect(useUI.getState().inspectorMode).toBe('icons');
      await userEvent.click(toggle);
      expect(useUI.getState().inspectorMode).toBe('expanded');
      await userEvent.click(toggle);
      expect(useUI.getState().inspectorMode).toBe('none');
    });

    it('should auto-close the inspector when focus mode is enabled', () => {
      act(() => { useUI.getState().setInspectorMode('expanded'); });
      renderWithProviders(
        <Topbar spaceId="s1" docId="d1" docName="Sample" mode="focus" />,
        { initialEntries: ['/s/s1/d/d1?focus=1'] },
      );
      expect(useUI.getState().inspectorMode).toBe('none');
    });

    it('should hide the inspector toggle in split mode', () => {
      renderWithProviders(
        <Topbar spaceId="s1" docId="d1" docName="Sample" mode="split" />,
        { initialEntries: ['/s/s1/d/d1/split'] },
      );
      expect(
        screen.queryByTestId('topbar-inspector-toggle'),
      ).not.toBeInTheDocument();
    });
  });

  describe('doc-name rename', () => {
    it('should enable editing on double-click and persist the new name on Enter', async () => {
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
      const docButton = screen.getByTestId('topbar-doc-name');
      expect(docButton).toHaveTextContent('Original');
      await user.dblClick(docButton);
      const input = await screen.findByTestId('topbar-doc-name-input');
      await user.clear(input);
      await user.type(input, 'Renamed{enter}');
      await waitFor(async () => {
        const fresh = await db.docs.get('d1');
        expect(fresh?.name).toBe('Renamed');
      });
    });

    it('should revert the draft and exit edit mode on Escape without persisting', async () => {
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
      await user.dblClick(screen.getByTestId('topbar-doc-name'));
      const input = await screen.findByTestId('topbar-doc-name-input');
      await user.clear(input);
      await user.type(input, 'Discard{escape}');
      await waitFor(() =>
        expect(
          screen.queryByTestId('topbar-doc-name-input'),
        ).not.toBeInTheDocument(),
      );
      expect(updateSpy).not.toHaveBeenCalled();
      updateSpy.mockRestore();
    });

    it('should not write to the DB when blurring with an empty or unchanged name', async () => {
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
      await user.dblClick(screen.getByTestId('topbar-doc-name'));
      const input = await screen.findByTestId('topbar-doc-name-input');
      fireEvent.blur(input);
      expect(updateSpy).not.toHaveBeenCalled();
      await user.dblClick(screen.getByTestId('topbar-doc-name'));
      const input2 = await screen.findByTestId('topbar-doc-name-input');
      await user.clear(input2);
      fireEvent.blur(input2);
      expect(updateSpy).not.toHaveBeenCalled();
      updateSpy.mockRestore();
    });

    it('should disable the doc-name button when docId is null and not enter edit mode on dblclick', async () => {
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
      const button = screen.getByTestId('topbar-doc-name');
      expect(button).toBeDisabled();
      await user.dblClick(button);
      expect(
        screen.queryByTestId('topbar-doc-name-input'),
      ).not.toBeInTheDocument();
    });
  });

  describe('focus toggle', () => {
    it('should hide the FocusToggle on /citations or when there is no docId and mode is not dump', () => {
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
      expect(screen.queryByTestId('focus-toggle')).not.toBeInTheDocument();
      rerender(
        <Topbar spaceId="s1" docId={null} spaceName="Test" mode="write" />,
      );
      expect(screen.queryByTestId('focus-toggle')).not.toBeInTheDocument();
    });

    it('should show the FocusToggle when mode is dump even without a docId', () => {
      renderWithProviders(
        <Topbar spaceId="s1" docId={null} spaceName="Test" mode="dump" />,
        { initialEntries: ['/s/s1/brain-space'] },
      );
      expect(screen.getByTestId('focus-toggle')).toBeInTheDocument();
    });
  });

  describe('snapshot', () => {
    it('should match the snapshot across all variants', () => {
      const { container: writeContainer } = renderWithProviders(
        <Topbar
          spaceId="s1"
          docId="d1"
          docName="Sample"
          spaceName="Test"
          mode="write"
        />,
        { initialEntries: ['/s/s1/d/d1'] },
      );
      expect(writeContainer).toMatchSnapshot('write');

      const { container: citationsContainer } = renderWithProviders(
        <Topbar
          spaceId="s1"
          docId={null}
          spaceName="Test"
          mode="write"
        />,
        { initialEntries: ['/s/s1/citations'] },
      );
      expect(citationsContainer).toMatchSnapshot('citations');

      const { container: focusContainer } = renderWithProviders(
        <Topbar
          spaceId="s1"
          docId="d1"
          docName="Sample"
          spaceName="Test"
          mode="focus"
        />,
        { initialEntries: ['/s/s1/d/d1?focus=1'] },
      );
      expect(focusContainer).toMatchSnapshot('focus');
    });
  });
});
