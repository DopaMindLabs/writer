import userEvent from '@testing-library/user-event';
import { act, renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import { sampleSpace, seedBasicSpace } from '@/test/fixtures';
import { Sidebar } from './Sidebar';

describe('Sidebar', () => {
  describe('rendering', () => {
    it('should render the space title and a seeded doc link', async () => {
      await seedBasicSpace();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      await waitFor(() => {
        expect(screen.getByTestId('sidebar-space-title')).toHaveTextContent(
          'Test Space',
        );
      });
      const docLink = await screen.findByTestId('sidebar-doc-d1');
      expect(docLink).toHaveTextContent('Sample Doc');
    });

    it('should render section headers for top-level and subsection', async () => {
      await seedBasicSpace();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      expect(
        await screen.findByTestId('sidebar-section-sec1-label'),
      ).toHaveTextContent('Drafts');
      expect(
        await screen.findByTestId('sidebar-section-sec1a-label'),
      ).toHaveTextContent(/Ideas/);
    });

    it('should render the empty placeholder for a subsection with no docs', async () => {
      await seedBasicSpace();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      const empty = await screen.findByTestId('sidebar-section-sec1a-empty');
      expect(empty).toHaveTextContent(/empty/i);
    });

    it('should render the "shared" subtitle when the space is marked shared', async () => {
      await db.spaces.put({ ...sampleSpace, shared: true });
      renderWithProviders(<Sidebar spaceId="s1" activeDocId={null} />, {
        initialEntries: ['/s/s1'],
      });
      const subtitle = await screen.findByTestId('sidebar-space-subtitle');
      await waitFor(() => {
        expect(subtitle).toHaveTextContent(/shared/i);
      });
      expect(subtitle).not.toHaveTextContent(/private · local/i);
    });

    it('should omit the Space menu trigger when the space has not loaded yet', () => {
      renderWithProviders(<Sidebar spaceId="missing" activeDocId={null} />, {
        initialEntries: ['/s/missing'],
      });
      expect(
        screen.queryByTestId('sidebar-space-menu-trigger'),
      ).not.toBeInTheDocument();
    });

    it('should not render the legacy bottom nav (home/about/github) — these moved to Quick Settings + Space menu', async () => {
      await seedBasicSpace();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      await screen.findByTestId('sidebar-space-title');
      expect(screen.queryByTestId('sidebar-nav-home')).not.toBeInTheDocument();
      expect(screen.queryByTestId('sidebar-nav-about')).not.toBeInTheDocument();
      expect(screen.queryByTestId('sidebar-nav-github')).not.toBeInTheDocument();
    });
  });

  describe('space menu trigger', () => {
    it('should render a hover-revealed Space menu trigger in the header', async () => {
      await seedBasicSpace();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      const trigger = await screen.findByTestId('sidebar-space-menu-trigger');
      expect(trigger.className).toMatch(/opacity-0/);
      expect(trigger.className).toMatch(/group-hover:opacity-100/);
    });

    it('should open the space menu popover with Settings, Backups, and Delete entries when clicked', async () => {
      await seedBasicSpace();
      const user = userEvent.setup();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      await user.click(
        await screen.findByTestId('sidebar-space-menu-trigger'),
      );
      await screen.findByTestId('space-menu-popover');
      expect(
        screen.getByTestId('space-menu-popover-settings'),
      ).toHaveAttribute('href', '/s/s1/settings');
      expect(
        screen.getByTestId('space-menu-popover-backups'),
      ).toHaveAttribute('href', '/s/s1/settings?tab=backups');
      expect(
        screen.getByTestId('space-menu-popover-delete'),
      ).toHaveAttribute('href', '/s/s1/settings?tab=danger');
    });

    it('should hide the Space menu trigger while renaming the space', async () => {
      await seedBasicSpace();
      const user = userEvent.setup();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      await user.click(await screen.findByTestId('sidebar-space-title'));
      await screen.findByTestId('sidebar-space-title-input');
      expect(
        screen.queryByTestId('sidebar-space-menu-trigger'),
      ).not.toBeInTheDocument();
    });
  });

  describe('rename space', () => {
    it('should rename the space via the title button + Enter', async () => {
      await seedBasicSpace();
      const user = userEvent.setup();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      await user.click(await screen.findByTestId('sidebar-space-title'));
      const input = await screen.findByTestId('sidebar-space-title-input');
      await user.clear(input);
      await user.type(input, 'New Name{enter}');
      await waitFor(async () => {
        const refreshed = await db.spaces.get('s1');
        expect(refreshed?.name).toBe('New Name');
      });
    });

    it('should revert to the original space name when Escape is pressed', async () => {
      await seedBasicSpace();
      const user = userEvent.setup();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      await user.click(await screen.findByTestId('sidebar-space-title'));
      const input = await screen.findByTestId('sidebar-space-title-input');
      await user.clear(input);
      await user.type(input, 'Will discard{escape}');
      await waitFor(() => {
        expect(screen.getByTestId('sidebar-space-title')).toHaveTextContent(
          'Test Space',
        );
      });
      const refreshed = await db.spaces.get('s1');
      expect(refreshed?.name).toBe('Test Space');
    });

    it('should not persist a rename when the new name is empty or unchanged', async () => {
      await seedBasicSpace();
      const user = userEvent.setup();
      const updateSpy = vi.spyOn(db.spaces, 'update');
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      await user.click(await screen.findByTestId('sidebar-space-title'));
      const input = await screen.findByTestId('sidebar-space-title-input');
      await user.clear(input);
      act(() => { input.blur(); });
      await waitFor(() => {
        expect(screen.getByTestId('sidebar-space-title')).toHaveTextContent(
          'Test Space',
        );
      });
      expect(updateSpy).not.toHaveBeenCalled();
      updateSpy.mockRestore();
    });
  });

  describe('add doc', () => {
    it('should open an add-doc input when + on a section is clicked', async () => {
      await seedBasicSpace();
      const user = userEvent.setup();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      await user.click(
        await screen.findByTestId('sidebar-section-sec1-add'),
      );
      const input = await screen.findByTestId(
        'sidebar-section-sec1-add-input',
      );
      expect(input).toHaveAttribute('placeholder', 'Doc name (Enter to create)');
    });

    it('should commit a new doc to Dexie on Enter', async () => {
      await seedBasicSpace();
      const beforeCount = await db.docs.count();
      const user = userEvent.setup();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      await user.click(
        await screen.findByTestId('sidebar-section-sec1-add'),
      );
      const input = await screen.findByTestId(
        'sidebar-section-sec1-add-input',
      );
      await user.clear(input);
      await user.type(input, 'New chapter{enter}');
      await waitFor(async () => {
        expect(await db.docs.count()).toBe(beforeCount + 1);
      });
    });

    it('should cancel the add-doc input on Escape', async () => {
      await seedBasicSpace();
      const user = userEvent.setup();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      await user.click(
        await screen.findByTestId('sidebar-section-sec1-add'),
      );
      const input = await screen.findByTestId(
        'sidebar-section-sec1-add-input',
      );
      await user.type(input, 'abc{escape}');
      await waitFor(() => {
        expect(
          screen.queryByTestId('sidebar-section-sec1-add-input'),
        ).not.toBeInTheDocument();
      });
    });

    it('should cancel the in-progress addition on blur', async () => {
      await seedBasicSpace();
      const user = userEvent.setup();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      await user.click(
        await screen.findByTestId('sidebar-section-sec1-add'),
      );
      const input = await screen.findByTestId(
        'sidebar-section-sec1-add-input',
      );
      await user.type(input, 'partial');
      act(() => { input.blur(); });
      await waitFor(() =>
        expect(
          screen.queryByTestId('sidebar-section-sec1-add-input'),
        ).not.toBeInTheDocument(),
      );
    });

    it('should fall back to "Untitled" when committing an empty add-doc name', async () => {
      await seedBasicSpace();
      const user = userEvent.setup();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      await user.click(
        await screen.findByTestId('sidebar-section-sec1-add'),
      );
      const input = await screen.findByTestId(
        'sidebar-section-sec1-add-input',
      );
      await user.clear(input);
      await user.type(input, '{enter}');
      await waitFor(async () => {
        const docs = await db.docs.toArray();
        const untitledDoc = docs.find(
          (d) => d.name === 'Untitled' && d.id !== 'd1',
        );
        expect(untitledDoc).toBeDefined();
      });
    });

    it('should add an indented doc input when + on a subsection is clicked', async () => {
      await seedBasicSpace();
      const user = userEvent.setup();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      await user.click(
        await screen.findByTestId('sidebar-section-sec1a-add'),
      );
      const input = await screen.findByTestId(
        'sidebar-section-sec1a-add-input',
      );
      await user.clear(input);
      await user.type(input, 'Subsection chapter{enter}');
      await waitFor(async () => {
        const docs = await db.docs.toArray();
        expect(docs.find((d) => d.sectionId === 'sec1a')?.name).toBe(
          'Subsection chapter',
        );
      });
    });

    it('should cancel the subsection add-doc input on blur', async () => {
      await seedBasicSpace();
      const user = userEvent.setup();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      await user.click(
        await screen.findByTestId('sidebar-section-sec1a-add'),
      );
      const input = await screen.findByTestId(
        'sidebar-section-sec1a-add-input',
      );
      act(() => { input.blur(); });
      await waitFor(() =>
        expect(
          screen.queryByTestId('sidebar-section-sec1a-add-input'),
        ).not.toBeInTheDocument(),
      );
    });

    it('should pre-fill the add-doc input with the template defaultDocName when the section matches', async () => {
      await db.spaces.put({ ...sampleSpace, template: 'fiction' });
      await db.sections.put({
        id: 'sec-ms',
        spaceId: 's1',
        parentSectionId: null,
        label: 'Manuscript',
        order: 0,
      });
      const user = userEvent.setup();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId={null} />, {
        initialEntries: ['/s/s1'],
      });
      await user.click(
        await screen.findByTestId('sidebar-section-sec-ms-add'),
      );
      const input = (await screen.findByTestId(
        'sidebar-section-sec-ms-add-input',
      )) as HTMLInputElement;
      expect(input.value.toLowerCase()).toMatch(/chapter/);
    });

    it('should use the "untitled" fallback for a template section without a defaultDocName', async () => {
      await db.spaces.put({ ...sampleSpace, template: 'fiction' });
      await db.sections.put({
        id: 'sec-w',
        spaceId: 's1',
        parentSectionId: null,
        label: 'World',
        order: 0,
      });
      const user = userEvent.setup();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId={null} />, {
        initialEntries: ['/s/s1'],
      });
      await user.click(
        await screen.findByTestId('sidebar-section-sec-w-add'),
      );
      const input = (await screen.findByTestId(
        'sidebar-section-sec-w-add-input',
      )) as HTMLInputElement;
      expect(input.value.toLowerCase()).toMatch(/untitled/);
    });
  });

  describe('brain space link', () => {
    it('should render the brain-space link with the note count when notes exist', async () => {
      await seedBasicSpace();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      const bs = await screen.findByTestId('sidebar-brain-space-link');
      expect(bs).toHaveAttribute('href', '/s/s1/brain-space');
      await waitFor(() => {
        expect(
          screen.getByTestId('sidebar-brain-space-link-count'),
        ).toHaveTextContent('1');
      });
    });

    it('should mark the brain-space link active when the URL ends with /brain-space', async () => {
      await seedBasicSpace();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId={null} />, {
        initialEntries: ['/s/s1/brain-space'],
      });
      const bs = await screen.findByTestId('sidebar-brain-space-link');
      expect(bs.className).toMatch(/font-medium/);
    });

    it('should render the Workshop fallback section when the template lacks Workshop', async () => {
      await db.spaces.put({ ...sampleSpace, template: 'blank' });
      await db.sections.put({
        id: 'sec-x',
        spaceId: 's1',
        parentSectionId: null,
        label: 'Other',
        order: 0,
      });
      renderWithProviders(<Sidebar spaceId="s1" activeDocId={null} />, {
        initialEntries: ['/s/s1'],
      });
      expect(
        await screen.findByTestId('sidebar-workshop-fallback-label'),
      ).toHaveTextContent(/workshop/i);
      expect(
        await screen.findByTestId('sidebar-brain-space-link'),
      ).toBeInTheDocument();
    });

    it('should render exactly one BrainSpace link inline under a seeded Workshop section', async () => {
      await db.spaces.put(sampleSpace);
      await db.sections.put({
        id: 'sec-ws',
        spaceId: 's1',
        parentSectionId: null,
        label: 'Workshop',
        order: 0,
      });
      renderWithProviders(<Sidebar spaceId="s1" activeDocId={null} />, {
        initialEntries: ['/s/s1'],
      });
      await screen.findByTestId('sidebar-section-sec-ws');
      await waitFor(() => {
        const links = screen.getAllByTestId('sidebar-brain-space-link');
        expect(links).toHaveLength(1);
      });
      expect(
        screen.queryByTestId('sidebar-workshop-fallback'),
      ).not.toBeInTheDocument();
    });
  });

  describe('doc link href', () => {
    it('should append the /read mode suffix when the URL ends with /read', async () => {
      await seedBasicSpace();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1/read'],
      });
      const docLink = await screen.findByTestId('sidebar-doc-d1');
      expect(docLink).toHaveAttribute('href', '/s/s1/d/d1/read');
    });

    it('should append the /split mode suffix when the URL ends with /split', async () => {
      await seedBasicSpace();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1/split'],
      });
      const docLink = await screen.findByTestId('sidebar-doc-d1');
      expect(docLink).toHaveAttribute('href', '/s/s1/d/d1/split');
    });
  });

  describe('word count', () => {
    it('should render the cached meta.wordCount', async () => {
      await seedBasicSpace();
      await db.docs.update('d1', { meta: { wordCount: 1234 } });
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      const count = await screen.findByTestId('sidebar-doc-d1-count');
      expect(count).toHaveTextContent('1,234');
    });

    it('should render the empty-circle indicator (◌) when the count is zero', async () => {
      await seedBasicSpace();
      await db.docs.update('d1', { meta: { wordCount: 0 } });
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      const count = await screen.findByTestId('sidebar-doc-d1-count');
      expect(count).toHaveTextContent('◌');
    });
  });

  describe('doc row menu', () => {
    it('should render a menu trigger with an accessible name, hidden on desktop', async () => {
      await seedBasicSpace();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      const trigger = await screen.findByTestId('sidebar-doc-d1-menu');
      expect(trigger).toHaveAccessibleName('Options for Sample Doc');
      expect(trigger).toHaveClass('md:hidden');
    });

    it('should keep the doc row link navigable alongside the menu trigger', async () => {
      await seedBasicSpace();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId={null} />, {
        initialEntries: ['/s/s1'],
      });
      const link = await screen.findByTestId('sidebar-doc-d1');
      expect(link).toHaveAttribute('href', '/s/s1/d/d1');
      expect(link).toHaveTextContent('Sample Doc');
    });

    it('should open the rename dialog from the Rename menu item', async () => {
      const user = userEvent.setup();
      await seedBasicSpace();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      await user.click(await screen.findByTestId('sidebar-doc-d1-menu'));
      await user.click(await screen.findByTestId('sidebar-doc-d1-rename'));
      const input = await screen.findByTestId('rename-doc-input');
      expect(input).toHaveValue('Sample Doc');
      expect(input).toHaveAccessibleName('Document name');
    });

    it('should rename the doc and update the row when submitted', async () => {
      const user = userEvent.setup();
      await seedBasicSpace();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      await user.click(await screen.findByTestId('sidebar-doc-d1-menu'));
      await user.click(await screen.findByTestId('sidebar-doc-d1-rename'));
      const input = await screen.findByTestId('rename-doc-input');
      await user.clear(input);
      await user.type(input, 'Chapter one');
      await user.click(screen.getByTestId('rename-doc-submit'));
      await waitFor(async () => {
        expect((await db.docs.get('d1'))?.name).toBe('Chapter one');
      });
      await waitFor(() => {
        expect(screen.getByTestId('sidebar-doc-d1-name')).toHaveTextContent(
          'Chapter one',
        );
      });
      expect(screen.queryByTestId('rename-doc-dialog')).not.toBeInTheDocument();
    });

    it('should not rename the doc when the dialog is cancelled', async () => {
      const user = userEvent.setup();
      await seedBasicSpace();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      await user.click(await screen.findByTestId('sidebar-doc-d1-menu'));
      await user.click(await screen.findByTestId('sidebar-doc-d1-rename'));
      const input = await screen.findByTestId('rename-doc-input');
      await user.clear(input);
      await user.type(input, 'Discarded');
      await user.click(screen.getByTestId('rename-doc-cancel'));
      await waitFor(() => {
        expect(
          screen.queryByTestId('rename-doc-dialog'),
        ).not.toBeInTheDocument();
      });
      expect((await db.docs.get('d1'))?.name).toBe('Sample Doc');
    });
  });

  describe('add section', () => {
    it('should render the add-section trigger when the template allows extra sections', async () => {
      await db.spaces.put({ ...sampleSpace, template: 'blank' });
      await db.sections.put({
        id: 'sec-notes',
        spaceId: 's1',
        parentSectionId: null,
        label: 'Notes',
        order: 0,
      });
      renderWithProviders(<Sidebar spaceId="s1" activeDocId={null} />, {
        initialEntries: ['/s/s1'],
      });
      expect(
        await screen.findByTestId('sidebar-add-section-trigger'),
      ).toBeInTheDocument();
    });

    it('should hide the add-section trigger when the template does not allow extra sections', async () => {
      await db.spaces.put({ ...sampleSpace, template: 'fiction' });
      await db.sections.put({
        id: 'sec-ms',
        spaceId: 's1',
        parentSectionId: null,
        label: 'Manuscript',
        order: 0,
      });
      renderWithProviders(<Sidebar spaceId="s1" activeDocId={null} />, {
        initialEntries: ['/s/s1'],
      });
      await screen.findByTestId('sidebar-section-sec-ms');
      expect(
        screen.queryByTestId('sidebar-add-section-trigger'),
      ).not.toBeInTheDocument();
    });

    it('should open an input when the add-section trigger is clicked', async () => {
      await db.spaces.put({ ...sampleSpace, template: 'blank' });
      await db.sections.put({
        id: 'sec-notes',
        spaceId: 's1',
        parentSectionId: null,
        label: 'Notes',
        order: 0,
      });
      const user = userEvent.setup();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId={null} />, {
        initialEntries: ['/s/s1'],
      });
      await user.click(
        await screen.findByTestId('sidebar-add-section-trigger'),
      );
      const input = await screen.findByTestId('sidebar-add-section-input');
      expect(input).toHaveAttribute(
        'placeholder',
        'Section name (Enter to create)',
      );
    });

    it('should commit a new section to Dexie on Enter at the next order', async () => {
      await db.spaces.put({ ...sampleSpace, template: 'blank' });
      await db.sections.put({
        id: 'sec-notes',
        spaceId: 's1',
        parentSectionId: null,
        label: 'Notes',
        order: 0,
      });
      const user = userEvent.setup();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId={null} />, {
        initialEntries: ['/s/s1'],
      });
      await user.click(
        await screen.findByTestId('sidebar-add-section-trigger'),
      );
      const input = await screen.findByTestId('sidebar-add-section-input');
      await user.type(input, 'Inbox{enter}');
      await waitFor(async () => {
        const sections = await db.sections
          .where('spaceId')
          .equals('s1')
          .toArray();
        const inbox = sections.find((s) => s.label === 'Inbox');
        expect(inbox).toBeDefined();
        expect(inbox?.parentSectionId).toBeNull();
        expect(inbox?.order).toBe(1);
      });
    });

    it('should cancel on Escape without writing to Dexie', async () => {
      await db.spaces.put({ ...sampleSpace, template: 'blank' });
      await db.sections.put({
        id: 'sec-notes',
        spaceId: 's1',
        parentSectionId: null,
        label: 'Notes',
        order: 0,
      });
      const beforeCount = await db.sections.count();
      const user = userEvent.setup();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId={null} />, {
        initialEntries: ['/s/s1'],
      });
      await user.click(
        await screen.findByTestId('sidebar-add-section-trigger'),
      );
      const input = await screen.findByTestId('sidebar-add-section-input');
      await user.type(input, 'Throwaway{escape}');
      await waitFor(() => {
        expect(
          screen.queryByTestId('sidebar-add-section-input'),
        ).not.toBeInTheDocument();
      });
      expect(await db.sections.count()).toBe(beforeCount);
    });

    it('should not commit an empty section name on Enter', async () => {
      await db.spaces.put({ ...sampleSpace, template: 'blank' });
      await db.sections.put({
        id: 'sec-notes',
        spaceId: 's1',
        parentSectionId: null,
        label: 'Notes',
        order: 0,
      });
      const beforeCount = await db.sections.count();
      const user = userEvent.setup();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId={null} />, {
        initialEntries: ['/s/s1'],
      });
      await user.click(
        await screen.findByTestId('sidebar-add-section-trigger'),
      );
      const input = await screen.findByTestId('sidebar-add-section-input');
      await user.type(input, '   {enter}');
      await waitFor(() => {
        expect(
          screen.queryByTestId('sidebar-add-section-input'),
        ).not.toBeInTheDocument();
      });
      expect(await db.sections.count()).toBe(beforeCount);
    });
  });

  describe('snapshot', () => {
    it('should match the snapshot across all variants', async () => {
      await seedBasicSpace();
      const { container } = renderWithProviders(
        <Sidebar spaceId="s1" activeDocId="d1" />,
        { initialEntries: ['/s/s1/d/d1'] },
      );
      await screen.findByTestId('sidebar-space-title');
      await screen.findByTestId('sidebar-doc-d1');
      expect(container).toMatchSnapshot();
    });
  });
});
