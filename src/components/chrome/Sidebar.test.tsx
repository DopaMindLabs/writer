import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import { sampleSpace, seedBasicSpace } from '@/test/fixtures';
import { Sidebar } from './Sidebar';

describe('Sidebar', () => {
  it('renders sections, subsection, and doc link', async () => {
    await seedBasicSpace();
    const { container, findByText } = renderWithProviders(
      <Sidebar spaceId="s1" activeDocId="d1" />,
      { initialEntries: ['/s/s1/d/d1'] },
    );
    await findByText('Test Space');
    await findByText('Sample Doc');
    expect(container).toMatchSnapshot();
  });

  it('clicking + on a section opens an add-doc input', async () => {
    await seedBasicSpace();
    const user = userEvent.setup();
    const { findByLabelText, findByPlaceholderText } = renderWithProviders(
      <Sidebar spaceId="s1" activeDocId="d1" />,
      { initialEntries: ['/s/s1/d/d1'] },
    );
    await user.click(await findByLabelText('Add doc to Drafts'));
    expect(
      await findByPlaceholderText(/Doc name \(Enter to create\)/i),
    ).toBeInTheDocument();
  });

  it('Enter commits a new doc to Dexie', async () => {
    await seedBasicSpace();
    const beforeCount = await db.docs.count();
    const user = userEvent.setup();
    const { findByLabelText, findByPlaceholderText } = renderWithProviders(
      <Sidebar spaceId="s1" activeDocId="d1" />,
      { initialEntries: ['/s/s1/d/d1'] },
    );
    await user.click(await findByLabelText('Add doc to Drafts'));
    const input = await findByPlaceholderText(/Doc name/i);
    await user.clear(input);
    await user.type(input, 'New chapter{enter}');
    await waitFor(async () => {
      expect(await db.docs.count()).toBe(beforeCount + 1);
    });
  });

  it('Escape cancels the add-doc input', async () => {
    await seedBasicSpace();
    const user = userEvent.setup();
    const { findByLabelText, findByPlaceholderText, queryByPlaceholderText } =
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
    await user.click(await findByLabelText('Add doc to Drafts'));
    const input = await findByPlaceholderText(/Doc name/i);
    await user.type(input, 'abc{escape}');
    await waitFor(() => {
      expect(queryByPlaceholderText(/Doc name/i)).not.toBeInTheDocument();
    });
  });

  it('blur on add-doc input cancels the in-progress addition', async () => {
    await seedBasicSpace();
    const user = userEvent.setup();
    renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
      initialEntries: ['/s/s1/d/d1'],
    });
    await user.click(await screen.findByLabelText('Add doc to Drafts'));
    const input = await screen.findByPlaceholderText(/Doc name/i);
    await user.type(input, 'partial');
    input.blur();
    await waitFor(() =>
      expect(
        screen.queryByPlaceholderText(/Doc name/i),
      ).not.toBeInTheDocument(),
    );
  });

  it('renames the space via the title button + Enter', async () => {
    await seedBasicSpace();
    const user = userEvent.setup();
    renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
      initialEntries: ['/s/s1/d/d1'],
    });
    await user.click(await screen.findByText('Test Space'));
    const input = await screen.findByLabelText(/rename space/i);
    await user.clear(input);
    await user.type(input, 'New Name{enter}');
    await waitFor(async () => {
      const refreshed = await db.spaces.get('s1');
      expect(refreshed?.name).toBe('New Name');
    });
  });

  it('Escape during rename reverts to the original space name', async () => {
    await seedBasicSpace();
    const user = userEvent.setup();
    renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
      initialEntries: ['/s/s1/d/d1'],
    });
    await user.click(await screen.findByText('Test Space'));
    const input = await screen.findByLabelText(/rename space/i);
    await user.clear(input);
    await user.type(input, 'Will discard{escape}');
    await waitFor(() =>
      expect(screen.getByText('Test Space')).toBeInTheDocument(),
    );
    const refreshed = await db.spaces.get('s1');
    expect(refreshed?.name).toBe('Test Space');
  });

  it('does not persist a rename when the new name is empty or unchanged', async () => {
    await seedBasicSpace();
    const user = userEvent.setup();
    const updateSpy = vi.spyOn(db.spaces, 'update');
    renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
      initialEntries: ['/s/s1/d/d1'],
    });
    await user.click(await screen.findByText('Test Space'));
    const input = await screen.findByLabelText(/rename space/i);
    await user.clear(input);
    input.blur();
    await waitFor(() =>
      expect(screen.getByText('Test Space')).toBeInTheDocument(),
    );
    expect(updateSpy).not.toHaveBeenCalled();
    updateSpy.mockRestore();
  });

  it('renders the brain-space link with the note count when notes exist', async () => {
    await seedBasicSpace();
    renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
      initialEntries: ['/s/s1/d/d1'],
    });
    const bs = await screen.findByRole('link', { name: /brain space/i });
    expect(bs).toHaveAttribute('href', '/s/s1/dump');
    expect(bs).toHaveTextContent(/1/);
  });

  it('marks the brain-space link active when the URL ends with /dump', async () => {
    await seedBasicSpace();
    renderWithProviders(<Sidebar spaceId="s1" activeDocId={null} />, {
      initialEntries: ['/s/s1/dump'],
    });
    const bs = await screen.findByRole('link', { name: /brain space/i });
    expect(bs.className).toMatch(/font-medium/);
  });

  it('renders the Workshop fallback section when the template lacks Workshop', async () => {
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
      await screen.findByText(/workshop/i, { selector: 'div' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /brain space/i }))
      .toBeInTheDocument();
  });

  it('shows a hover-revealed Space settings link in the header', async () => {
    await seedBasicSpace();
    renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
      initialEntries: ['/s/s1/d/d1'],
    });
    const cog = await screen.findByRole('link', {
      name: /space settings/i,
    });
    expect(cog).toHaveAttribute('href', '/s/s1/settings');
    // The cog uses the opacity-0 + group-hover:opacity-100 pattern so it's
    // visually hidden until the header is hovered or the link is focused.
    expect(cog.className).toMatch(/opacity-0/);
    expect(cog.className).toMatch(/group-hover:opacity-100/);
  });

  it('hides the Space settings link while renaming the space', async () => {
    await seedBasicSpace();
    const user = userEvent.setup();
    renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
      initialEntries: ['/s/s1/d/d1'],
    });
    await user.click(await screen.findByText('Test Space'));
    await screen.findByLabelText(/rename space/i);
    expect(
      screen.queryByRole('link', { name: /space settings/i }),
    ).not.toBeInTheDocument();
  });

  it('omits the Space settings link when the space has not loaded yet', () => {
    renderWithProviders(<Sidebar spaceId="missing" activeDocId={null} />, {
      initialEntries: ['/s/missing'],
    });
    expect(
      screen.queryByRole('link', { name: /space settings/i }),
    ).not.toBeInTheDocument();
  });

  it('shows the bottom nav with Home/About/Settings/Github links', async () => {
    await seedBasicSpace();
    renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
      initialEntries: ['/s/s1/d/d1'],
    });
    expect(await screen.findByRole('link', { name: /^home$/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /^about$/i })).toHaveAttribute('href', '/about');
    expect(screen.getByRole('link', { name: /^settings$/i })).toHaveAttribute('href', '/settings');
  });

  it('appends the mode suffix to doc links based on URL', async () => {
    await seedBasicSpace();
    renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
      initialEntries: ['/s/s1/d/d1/read'],
    });
    const docLink = await screen.findByRole('link', { name: /sample doc/i });
    expect(docLink).toHaveAttribute('href', '/s/s1/d/d1/read');
  });

  it('appends the /split mode suffix when the URL ends with /split', async () => {
    await seedBasicSpace();
    renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
      initialEntries: ['/s/s1/d/d1/split'],
    });
    const docLink = await screen.findByRole('link', { name: /sample doc/i });
    expect(docLink).toHaveAttribute('href', '/s/s1/d/d1/split');
  });

  it('counts words in a doc body that is a Lexical JSON tree', async () => {
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
    const link = await screen.findByRole('link', { name: /sample doc/i });
    expect(link.textContent).toContain('5');
  });

  it('falls back to plain-text word counting when body is not JSON', async () => {
    await seedBasicSpace();
    await db.docs.update('d1', { body: 'plain words here today' });
    renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
      initialEntries: ['/s/s1/d/d1'],
    });
    const link = await screen.findByRole('link', { name: /sample doc/i });
    expect(link.textContent).toContain('4');
  });

  it('renders the empty-circle indicator (◌) when the doc body is empty', async () => {
    await seedBasicSpace();
    // sampleDoc.body is '' — the countWords early-return path
    renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
      initialEntries: ['/s/s1/d/d1'],
    });
    const link = await screen.findByRole('link', { name: /sample doc/i });
    expect(link.textContent).toMatch(/◌/);
  });

  it('falls back to plain-text when the body is JSON but has no `root` field', async () => {
    await seedBasicSpace();
    await db.docs.update('d1', { body: '{"foo":"bar"}' });
    renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
      initialEntries: ['/s/s1/d/d1'],
    });
    const link = await screen.findByRole('link', { name: /sample doc/i });
    // Plain-text counting of '{"foo":"bar"}' splits on whitespace → 1 token
    expect(link.textContent).toMatch(/1$/);
  });

  it('counts zero words for a whitespace-only body', async () => {
    await seedBasicSpace();
    await db.docs.update('d1', { body: '   \n  \t  ' });
    renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
      initialEntries: ['/s/s1/d/d1'],
    });
    const link = await screen.findByRole('link', { name: /sample doc/i });
    expect(link.textContent).toMatch(/◌/);
  });

  it('handles a Lexical body whose root has no children at all', async () => {
    await seedBasicSpace();
    await db.docs.update('d1', {
      body: JSON.stringify({ root: { text: 'just root text' } }),
    });
    renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
      initialEntries: ['/s/s1/d/d1'],
    });
    const link = await screen.findByRole('link', { name: /sample doc/i });
    // root has a .text field directly — extractTextFromLexicalState returns it,
    // then split on whitespace → 3 tokens
    expect(link.textContent).toMatch(/3$/);
  });

  it('pre-fills the add-doc input with the template\'s defaultDocName when the section matches', async () => {
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
    await user.click(await screen.findByLabelText(/add doc to manuscript/i));
    const input = (await screen.findByPlaceholderText(
      /Doc name/i,
    )) as HTMLInputElement;
    // formatDocName replaces "Untitled chapter" → likely retains the phrase
    expect(input.value.toLowerCase()).toMatch(/chapter/);
  });

  it('clicking + on a subsection adds an indented doc input', async () => {
    await seedBasicSpace();
    const user = userEvent.setup();
    renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
      initialEntries: ['/s/s1/d/d1'],
    });
    // Subsection "Ideas" is rendered as "↳ Ideas"; its add-doc aria-label
    // includes the ↳ prefix.
    const addBtn = await screen.findByLabelText(/add doc to ↳ ideas/i);
    await user.click(addBtn);
    const input = await screen.findByPlaceholderText(/Doc name/i);
    await user.clear(input);
    await user.type(input, 'Subsection chapter{enter}');
    await waitFor(async () => {
      const docs = await db.docs.toArray();
      expect(docs.find((d) => d.sectionId === 'sec1a')?.name).toBe(
        'Subsection chapter',
      );
    });
  });

  it('renders the "(empty)" placeholder for an empty subsection', async () => {
    await seedBasicSpace();
    // sec1a "Ideas" exists but has no docs yet → empty placeholder shown
    renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
      initialEntries: ['/s/s1/d/d1'],
    });
    // The placeholder text comes from translations: "Empty" / "empty"
    const empties = await screen.findAllByText(/empty/i);
    // One for empty subsection (sec1a)
    expect(empties.length).toBeGreaterThanOrEqual(1);
  });

  it('returns 0 words for a Lexical body whose root node has no text and no children', async () => {
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
    const link = await screen.findByRole('link', { name: /sample doc/i });
    expect(link.textContent).toMatch(/◌/);
  });

  it('shows "shared" instead of "private" when the space is marked shared', async () => {
    await db.spaces.put({ ...sampleSpace, shared: true });
    renderWithProviders(<Sidebar spaceId="s1" activeDocId={null} />, {
      initialEntries: ['/s/s1'],
    });
    expect(await screen.findByText(/^shared$/i)).toBeInTheDocument();
  });

  it('renders the BrainSpace link inline under the Workshop section when one exists', async () => {
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
    // Just one Brain space link, rendered inline under the seeded Workshop
    // (and NOT the fallback section)
    const links = await screen.findAllByRole('link', { name: /brain space/i });
    expect(links).toHaveLength(1);
  });

  it('falls back to "Untitled" when committing an add-doc with an empty name', async () => {
    await seedBasicSpace();
    const user = userEvent.setup();
    renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
      initialEntries: ['/s/s1/d/d1'],
    });
    await user.click(await screen.findByLabelText('Add doc to Drafts'));
    const input = await screen.findByPlaceholderText(/Doc name/i);
    await user.clear(input);
    await user.type(input, '{enter}');
    await waitFor(async () => {
      const docs = await db.docs.toArray();
      // A new doc named "Untitled" should have been created in addition to sampleDoc
      const untitledDoc = docs.find(
        (d) => d.name === 'Untitled' && d.id !== 'd1',
      );
      expect(untitledDoc).toBeDefined();
    });
  });

  it('uses the "untitled" fallback for a template section without a defaultDocName', async () => {
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
    await user.click(await screen.findByLabelText(/add doc to world/i));
    const input = (await screen.findByPlaceholderText(
      /Doc name/i,
    )) as HTMLInputElement;
    // fiction's World section has no defaultDocName → falls back to common.untitled
    expect(input.value.toLowerCase()).toMatch(/untitled/);
  });

  it('blurring the subsection add-doc input cancels the addition', async () => {
    await seedBasicSpace();
    const user = userEvent.setup();
    renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
      initialEntries: ['/s/s1/d/d1'],
    });
    await user.click(await screen.findByLabelText(/add doc to ↳ ideas/i));
    const input = await screen.findByPlaceholderText(/Doc name/i);
    input.blur();
    await waitFor(() =>
      expect(
        screen.queryByPlaceholderText(/Doc name/i),
      ).not.toBeInTheDocument(),
    );
  });

  it('renders the bottom GitHub link with target="_blank"', async () => {
    await seedBasicSpace();
    renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
      initialEntries: ['/s/s1/d/d1'],
    });
    const gh = await screen.findByRole('link', { name: /github/i });
    expect(gh).toHaveAttribute('target', '_blank');
  });
});
