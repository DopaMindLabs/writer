import userEvent from '@testing-library/user-event';
import {
  act,
  renderWithProviders,
  screen,
  waitFor,
  within,
} from '@/test/test-utils';
import { db } from '@/db/db';
import { EMPTY_LEXICAL_JSON } from '@/lib/docs/emptyBody';
import { FIXED_TIME, sampleSpace, seedBasicSpace } from '@/test/fixtures';
import { Sidebar } from './Sidebar';

type User = ReturnType<typeof userEvent.setup>;

// Adding a document is now reached through the section's kebab menu rather than
// a bare "+"; open the menu then pick "Add document".
const openAddDoc = async (user: User, sectionId: string): Promise<void> => {
  await user.click(await screen.findByTestId(`sidebar-section-${sectionId}-menu`));
  await user.click(await screen.findByTestId(`sidebar-section-${sectionId}-add-doc`));
};

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

    it('should render the top-level section header but not the subsection header', async () => {
      await seedBasicSpace();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      expect(
        await screen.findByTestId('sidebar-section-sec1-label'),
      ).toHaveTextContent('Drafts');
      // Subsections are flattened into their parent section — no header row is
      // rendered for them, and the `↳` glyph never appears in the nav.
      expect(
        screen.queryByTestId('sidebar-section-sec1a-header'),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('sidebar-section-sec1a-label'),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/↳/)).not.toBeInTheDocument();
    });

    it('should render a subsection doc flattened under its parent section, not indented', async () => {
      await seedBasicSpace();
      await db.docs.put({
        id: 'd-sub',
        spaceId: 's1',
        sectionId: 'sec1a',
        name: 'Sub doc',
        body: EMPTY_LEXICAL_JSON,
        meta: { wordCount: 0 },
        updatedAt: 0,
      });
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      const section = await screen.findByTestId('sidebar-section-sec1');
      const link = await within(section).findByTestId('sidebar-doc-d-sub');
      expect(link).toHaveTextContent('Sub doc');
      // Flattened rows sit at section level (pl-5), never at the subsection
      // indent (pl-7).
      const row = link.parentElement;
      expect(row?.className).toMatch(/pl-5/);
      expect(row?.className).not.toMatch(/pl-7/);
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
      await openAddDoc(user, 'sec1');
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
      await openAddDoc(user, 'sec1');
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
      await openAddDoc(user, 'sec1');
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

    it('should commit the in-progress add-doc to Dexie on blur when value is present', async () => {
      await seedBasicSpace();
      const beforeCount = await db.docs.count();
      const user = userEvent.setup();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      await openAddDoc(user, 'sec1');
      const input = await screen.findByTestId(
        'sidebar-section-sec1-add-input',
      );
      await user.clear(input);
      await user.type(input, 'Blur saves');
      act(() => { input.blur(); });
      await waitFor(() =>
        expect(
          screen.queryByTestId('sidebar-section-sec1-add-input'),
        ).not.toBeInTheDocument(),
      );
      expect(await db.docs.count()).toBe(beforeCount + 1);
      const docs = await db.docs.toArray();
      expect(docs.find((d) => d.name === 'Blur saves')).toBeDefined();
    });

    it('should clear the add-doc input on blur without writing when the value is empty', async () => {
      await seedBasicSpace();
      const beforeCount = await db.docs.count();
      const user = userEvent.setup();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      await openAddDoc(user, 'sec1');
      const input = await screen.findByTestId(
        'sidebar-section-sec1-add-input',
      );
      await user.clear(input);
      act(() => { input.blur(); });
      await waitFor(() =>
        expect(
          screen.queryByTestId('sidebar-section-sec1-add-input'),
        ).not.toBeInTheDocument(),
      );
      expect(await db.docs.count()).toBe(beforeCount);
    });

    it('should fall back to "Untitled" when committing an empty add-doc name', async () => {
      await seedBasicSpace();
      const user = userEvent.setup();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      await openAddDoc(user, 'sec1');
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
      await openAddDoc(user, 'sec-ms');
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
      await openAddDoc(user, 'sec-w');
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
    it('should render a menu trigger with an accessible name, hover-revealed on desktop', async () => {
      await seedBasicSpace();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      const trigger = await screen.findByTestId('sidebar-doc-d1-menu');
      expect(trigger).toHaveAccessibleName('Options for Sample Doc');
      // No longer hidden on desktop — revealed on row hover / focus instead.
      expect(trigger).not.toHaveClass('md:hidden');
      expect(trigger).toHaveClass('md:opacity-0');
      expect(trigger).toHaveClass('md:group-hover:opacity-100');
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

    it('should switch the row to the inline rename input from the Rename menu item', async () => {
      const user = userEvent.setup();
      await seedBasicSpace();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      await user.click(await screen.findByTestId('sidebar-doc-d1-menu'));
      await user.click(await screen.findByTestId('sidebar-doc-d1-rename'));
      const input = await screen.findByTestId('sidebar-doc-d1-rename-input');
      expect(input).toHaveValue('Sample Doc');
      expect(input).toHaveFocus();
    });

    it('should rename the doc and update the row on Enter', async () => {
      const user = userEvent.setup();
      await seedBasicSpace();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      await user.click(await screen.findByTestId('sidebar-doc-d1-menu'));
      await user.click(await screen.findByTestId('sidebar-doc-d1-rename'));
      const input = await screen.findByTestId('sidebar-doc-d1-rename-input');
      await user.clear(input);
      await user.type(input, 'Chapter one{Enter}');
      await waitFor(async () => {
        expect((await db.docs.get('d1'))?.name).toBe('Chapter one');
      });
      await waitFor(() => {
        expect(screen.getByTestId('sidebar-doc-d1-name')).toHaveTextContent(
          'Chapter one',
        );
      });
    });

    it('should not rename the doc when the inline edit is escaped', async () => {
      const user = userEvent.setup();
      await seedBasicSpace();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      await user.click(await screen.findByTestId('sidebar-doc-d1-menu'));
      await user.click(await screen.findByTestId('sidebar-doc-d1-rename'));
      const input = await screen.findByTestId('sidebar-doc-d1-rename-input');
      await user.clear(input);
      await user.type(input, 'Discarded{Escape}');
      await waitFor(() => {
        expect(
          screen.queryByTestId('sidebar-doc-d1-rename-input'),
        ).not.toBeInTheDocument();
      });
      expect((await db.docs.get('d1'))?.name).toBe('Sample Doc');
    });

    it('should delete the doc and remove its row when confirmed', async () => {
      const user = userEvent.setup();
      await seedBasicSpace();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId={null} />, {
        initialEntries: ['/s/s1'],
      });
      await user.click(await screen.findByTestId('sidebar-doc-d1-menu'));
      await user.click(await screen.findByTestId('sidebar-doc-d1-delete'));
      await user.click(await screen.findByTestId('confirm-dialog-confirm'));
      await waitFor(async () => {
        expect(await db.docs.get('d1')).toBeUndefined();
      });
      await waitFor(() => {
        expect(screen.queryByTestId('sidebar-doc-d1')).not.toBeInTheDocument();
      });
    });

    it('should not delete the doc when the confirmation is cancelled', async () => {
      const user = userEvent.setup();
      await seedBasicSpace();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId={null} />, {
        initialEntries: ['/s/s1'],
      });
      await user.click(await screen.findByTestId('sidebar-doc-d1-menu'));
      await user.click(await screen.findByTestId('sidebar-doc-d1-delete'));
      await user.click(await screen.findByTestId('confirm-dialog-cancel'));
      await waitFor(() => {
        expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
      });
      expect(await db.docs.get('d1')).toBeDefined();
      expect(screen.getByTestId('sidebar-doc-d1')).toBeInTheDocument();
    });
  });

  describe('rename section via double-click', () => {
    it('should open an inline rename input on double-click of the section label', async () => {
      await seedBasicSpace();
      const user = userEvent.setup();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      const label = await screen.findByTestId('sidebar-section-sec1-label');
      await user.dblClick(label);
      const input = await screen.findByTestId(
        'sidebar-section-sec1-rename-input',
      );
      expect(input).toHaveValue('Drafts');
    });

    it('should commit the rename to Dexie on Enter', async () => {
      await seedBasicSpace();
      const user = userEvent.setup();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      await user.dblClick(
        await screen.findByTestId('sidebar-section-sec1-label'),
      );
      const input = await screen.findByTestId(
        'sidebar-section-sec1-rename-input',
      );
      await user.clear(input);
      await user.type(input, 'Renamed{enter}');
      await waitFor(async () => {
        expect((await db.sections.get('sec1'))?.label).toBe('Renamed');
      });
    });

    it('should commit the rename on blur when the value changed', async () => {
      await seedBasicSpace();
      const user = userEvent.setup();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      await user.dblClick(
        await screen.findByTestId('sidebar-section-sec1-label'),
      );
      const input = await screen.findByTestId(
        'sidebar-section-sec1-rename-input',
      );
      await user.clear(input);
      await user.type(input, 'Saved on blur');
      act(() => { input.blur(); });
      await waitFor(async () => {
        expect((await db.sections.get('sec1'))?.label).toBe('Saved on blur');
      });
    });

    it('should revert and not write on Escape', async () => {
      await seedBasicSpace();
      const user = userEvent.setup();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      await user.dblClick(
        await screen.findByTestId('sidebar-section-sec1-label'),
      );
      const input = await screen.findByTestId(
        'sidebar-section-sec1-rename-input',
      );
      await user.clear(input);
      await user.type(input, 'Discarded{escape}');
      await waitFor(() => {
        expect(
          screen.queryByTestId('sidebar-section-sec1-rename-input'),
        ).not.toBeInTheDocument();
      });
      expect((await db.sections.get('sec1'))?.label).toBe('Drafts');
    });
  });

  describe('rename doc via double-click', () => {
    it('should open an inline rename input on double-click of the doc link', async () => {
      await seedBasicSpace();
      const user = userEvent.setup();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      await user.dblClick(await screen.findByTestId('sidebar-doc-d1'));
      const input = await screen.findByTestId('sidebar-doc-d1-rename-input');
      expect(input).toHaveValue('Sample Doc');
    });

    it('should commit the rename to Dexie on Enter', async () => {
      await seedBasicSpace();
      const user = userEvent.setup();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      await user.dblClick(await screen.findByTestId('sidebar-doc-d1'));
      const input = await screen.findByTestId('sidebar-doc-d1-rename-input');
      await user.clear(input);
      await user.type(input, 'Inline rename{enter}');
      await waitFor(async () => {
        expect((await db.docs.get('d1'))?.name).toBe('Inline rename');
      });
    });

    it('should revert and not write on Escape', async () => {
      await seedBasicSpace();
      const user = userEvent.setup();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      await user.dblClick(await screen.findByTestId('sidebar-doc-d1'));
      const input = await screen.findByTestId('sidebar-doc-d1-rename-input');
      await user.clear(input);
      await user.type(input, 'Discarded{escape}');
      await waitFor(() => {
        expect(
          screen.queryByTestId('sidebar-doc-d1-rename-input'),
        ).not.toBeInTheDocument();
      });
      expect((await db.docs.get('d1'))?.name).toBe('Sample Doc');
    });

    it('should commit the rename on blur when the value changed', async () => {
      await seedBasicSpace();
      const user = userEvent.setup();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      await user.dblClick(await screen.findByTestId('sidebar-doc-d1'));
      const input = await screen.findByTestId('sidebar-doc-d1-rename-input');
      await user.clear(input);
      await user.type(input, 'Saved on blur');
      act(() => { input.blur(); });
      await waitFor(async () => {
        expect((await db.docs.get('d1'))?.name).toBe('Saved on blur');
      });
    });

    it('should support double-click rename on a doc inside a subsection', async () => {
      await seedBasicSpace();
      await db.docs.put({
        id: 'd-sub',
        spaceId: 's1',
        sectionId: 'sec1a',
        name: 'Sub doc',
        body: EMPTY_LEXICAL_JSON,
        meta: { wordCount: 0 },
        updatedAt: 0,
      });
      const user = userEvent.setup();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      await user.dblClick(await screen.findByTestId('sidebar-doc-d-sub'));
      const input = await screen.findByTestId(
        'sidebar-doc-d-sub-rename-input',
      );
      await user.clear(input);
      await user.type(input, 'Renamed sub');
      act(() => { input.blur(); });
      await waitFor(async () => {
        expect((await db.docs.get('d-sub'))?.name).toBe('Renamed sub');
      });
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

    it('should hide the add-section trigger by default and reveal it on hover of the row', async () => {
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
      const trigger = await screen.findByTestId('sidebar-add-section-trigger');
      expect(trigger.className).toMatch(/opacity-0/);
      expect(trigger.className).toMatch(/group-hover:opacity-100/);
      const row = screen.getByTestId('sidebar-add-section-row');
      expect(row.className).toMatch(/\bgroup\b/);
    });

    it('should show the add-section trigger for a structured template (sections are configurable by default)', async () => {
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
        await screen.findByTestId('sidebar-add-section-trigger'),
      ).toBeInTheDocument();
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

    it('should commit a new section on blur when the input has a value', async () => {
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
      await user.type(input, 'Saved on blur');
      act(() => { input.blur(); });
      await waitFor(async () => {
        const sections = await db.sections
          .where('spaceId')
          .equals('s1')
          .toArray();
        expect(sections.find((s) => s.label === 'Saved on blur')).toBeDefined();
      });
    });

    it('should clear on blur without writing when the input is empty', async () => {
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
      act(() => { input.blur(); });
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

  describe('section row menu', () => {
    it('deletes a section and its documents from the sidebar via the menu', async () => {
      await seedBasicSpace();
      const user = userEvent.setup();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId={null} />, {
        initialEntries: ['/s/s1'],
      });
      await user.click(await screen.findByTestId('sidebar-section-sec1-menu'));
      await user.click(await screen.findByTestId('sidebar-section-sec1-delete'));
      // The warning names the document that will be lost.
      expect(
        await screen.findByText(/“Drafts” and its 1 document will be permanently/),
      ).toBeInTheDocument();
      await user.click(await screen.findByTestId('confirm-dialog-confirm'));

      await waitFor(async () => {
        expect(await db.sections.get('sec1')).toBeUndefined();
      });
      await waitFor(() => {
        expect(
          screen.queryByTestId('sidebar-section-sec1'),
        ).not.toBeInTheDocument();
      });
      expect(await db.docs.get('d1')).toBeUndefined();
    });

    it('keeps the section when the delete confirmation is cancelled', async () => {
      await seedBasicSpace();
      const user = userEvent.setup();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId={null} />, {
        initialEntries: ['/s/s1'],
      });
      await user.click(await screen.findByTestId('sidebar-section-sec1-menu'));
      await user.click(await screen.findByTestId('sidebar-section-sec1-delete'));
      await user.click(await screen.findByTestId('confirm-dialog-cancel'));
      await waitFor(() => {
        expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
      });
      expect(await db.sections.get('sec1')).toBeDefined();
      expect(screen.getByTestId('sidebar-section-sec1')).toBeInTheDocument();
    });

    it('does not offer rename or delete for the Workshop section', async () => {
      await db.spaces.put(sampleSpace);
      await db.sections.put({
        id: 'sec-ws',
        spaceId: 's1',
        parentSectionId: null,
        label: 'Workshop',
        order: 0,
      });
      const user = userEvent.setup();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId={null} />, {
        initialEntries: ['/s/s1'],
      });
      await user.click(await screen.findByTestId('sidebar-section-sec-ws-menu'));
      expect(
        screen.getByTestId('sidebar-section-sec-ws-add-doc'),
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId('sidebar-section-sec-ws-rename'),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('sidebar-section-sec-ws-delete'),
      ).not.toBeInTheDocument();
    });

    it('renames a section from the menu', async () => {
      await seedBasicSpace();
      const user = userEvent.setup();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId={null} />, {
        initialEntries: ['/s/s1'],
      });
      await user.click(await screen.findByTestId('sidebar-section-sec1-menu'));
      await user.click(await screen.findByTestId('sidebar-section-sec1-rename'));
      const input = await screen.findByTestId('sidebar-section-sec1-rename-input');
      await user.clear(input);
      await user.type(input, 'Chapters{enter}');
      await waitFor(async () => {
        expect((await db.sections.get('sec1'))?.label).toBe('Chapters');
      });
    });
  });

  describe('locked template (no configuration)', () => {
    it('does not wire dragging or the add-section affordance', async () => {
      // An unresolved template is treated as not configurable.
      await db.spaces.put({ ...sampleSpace, template: 'locked-xyz' });
      await db.sections.put({
        id: 'sec-x',
        spaceId: 's1',
        parentSectionId: null,
        label: 'Locked',
        order: 0,
      });
      await db.docs.put({
        id: 'd-x',
        spaceId: 's1',
        sectionId: 'sec-x',
        name: 'Locked doc',
        body: EMPTY_LEXICAL_JSON,
        meta: { wordCount: 0 },
        updatedAt: 0,
      });
      renderWithProviders(<Sidebar spaceId="s1" activeDocId={null} />, {
        initialEntries: ['/s/s1'],
      });
      const header = await screen.findByTestId('sidebar-section-sec-x-header');
      // No drag surface: the header is not a sortable and carries no grab cursor.
      expect(header).not.toHaveAttribute('aria-roledescription', 'sortable');
      expect(header.className).not.toMatch(/cursor-grab/);
      const docRow = await screen.findByTestId('sidebar-doc-d-x-sortable');
      expect(docRow.className).not.toMatch(/cursor-grab/);
      expect(
        screen.queryByTestId('sidebar-add-section-trigger'),
      ).not.toBeInTheDocument();
    });
  });

  describe('snapshot', () => {
    beforeEach(() => {
      vi.useFakeTimers({
        toFake: ['Date', 'setTimeout', 'clearTimeout'],
        shouldAdvanceTime: true,
      });
      vi.setSystemTime(FIXED_TIME);
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('should match the snapshot across all variants', async () => {
      await seedBasicSpace();
      const { container } = renderWithProviders(
        <Sidebar spaceId="s1" activeDocId="d1" />,
        { initialEntries: ['/s/s1/d/d1'] },
      );
      // Wait for the loaded space + doc rather than just the testids so the
      // snapshot deterministically captures the populated state.
      await screen.findByText('Test Space');
      await screen.findByText('Sample Doc');
      expect(container).toMatchSnapshot();
    });
  });
});
