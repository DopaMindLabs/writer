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
});
