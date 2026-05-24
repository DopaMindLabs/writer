import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
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
      // Trigger uses opacity-0 + group-hover:opacity-100 so it's hidden until
      // the header is hovered or the trigger is focused.
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
      input.blur();
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
      input.blur();
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
      input.blur();
      await waitFor(() =>
        expect(
          screen.queryByTestId('sidebar-section-sec1a-add-input'),
        ).not.toBeInTheDocument(),
      );
    });

    it('should pre-fill the add-doc input with the template defaultDocName when the section matches', async () => {
      // Fiction template has a "Manuscript" section with defaultDocName.
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
      // fiction template has "World" section without defaultDocName.
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
      expect(bs).toHaveAttribute('href', '/s/s1/dump');
      await waitFor(() => {
        expect(
          screen.getByTestId('sidebar-brain-space-link-count'),
        ).toHaveTextContent('1');
      });
    });

    it('should mark the brain-space link active when the URL ends with /dump', async () => {
      await seedBasicSpace();
      renderWithProviders(<Sidebar spaceId="s1" activeDocId={null} />, {
        initialEntries: ['/s/s1/dump'],
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
      // Wait for the seeded section to mount so the fallback is unmounted
      await screen.findByTestId('sidebar-section-sec-ws');
      // Just one Brain space link, rendered inline under the seeded Workshop
      // (and NOT the fallback section)
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
    it('should count words in a doc body that is a Lexical JSON tree', async () => {
      await seedBasicSpace();
      const lexicalBody = JSON.stringify({
        root: {
          children: [
            {
              children: [
                { text: 'one two' },
                { text: ' three four five' },
              ],
            },
          ],
        },
      });
      await db.docs.update('d1', { body: lexicalBody });
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      const count = await screen.findByTestId('sidebar-doc-d1-count');
      expect(count).toHaveTextContent('5');
    });

    it('should fall back to plain-text word counting when body is not JSON', async () => {
      await seedBasicSpace();
      await db.docs.update('d1', { body: 'plain words here today' });
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      const count = await screen.findByTestId('sidebar-doc-d1-count');
      expect(count).toHaveTextContent('4');
    });

    it('should render the empty-circle indicator (◌) when the doc body is empty', async () => {
      await seedBasicSpace();
      // sampleDoc.body is '' — the countWords early-return path
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      const count = await screen.findByTestId('sidebar-doc-d1-count');
      expect(count).toHaveTextContent('◌');
    });

    it('should fall back to plain-text when the body is JSON but has no `root` field', async () => {
      await seedBasicSpace();
      await db.docs.update('d1', { body: '{"foo":"bar"}' });
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      const count = await screen.findByTestId('sidebar-doc-d1-count');
      // Plain-text counting of '{"foo":"bar"}' splits on whitespace → 1 token
      expect(count.textContent).toMatch(/1$/);
    });

    it('should count zero words for a whitespace-only body', async () => {
      await seedBasicSpace();
      await db.docs.update('d1', { body: '   \n  \t  ' });
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      const count = await screen.findByTestId('sidebar-doc-d1-count');
      expect(count).toHaveTextContent('◌');
    });

    it('should handle a Lexical body whose root has text directly (no children)', async () => {
      await seedBasicSpace();
      await db.docs.update('d1', {
        body: JSON.stringify({ root: { text: 'just root text' } }),
      });
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      const count = await screen.findByTestId('sidebar-doc-d1-count');
      // root has a .text field directly — extractTextFromLexicalState returns it,
      // then split on whitespace → 3 tokens
      expect(count.textContent).toMatch(/3$/);
    });

    it('should return 0 words for a Lexical body whose root has no text and no children', async () => {
      await seedBasicSpace();
      // Synthetic Lexical-shaped JSON where root is an object with neither
      // `text` nor `children` — exercises the `return ''` fallback in
      // extractTextFromLexicalState.
      await db.docs.update('d1', {
        body: JSON.stringify({ root: { type: 'unknown' } }),
      });
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      const count = await screen.findByTestId('sidebar-doc-d1-count');
      expect(count).toHaveTextContent('◌');
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
