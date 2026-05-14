import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils';
import { db } from '@/db/db';
import { sampleSpace } from '@/test/fixtures';
import type { Citation } from '@/db/schema';
import { CitationsPane } from './CitationsPane';

function citation(overrides: Partial<Citation> = {}): Citation {
  return {
    id: 'c-base',
    spaceId: 's1',
    key: 'smith2020',
    authors: 'Smith, John',
    title: 'On testing',
    year: 2020,
    type: 'article',
    useCount: 0,
    ...overrides,
  };
}

async function seedSpace() {
  await db.spaces.put(sampleSpace);
}

describe('CitationsPane', () => {
  it('renders empty state when no citations exist', async () => {
    await seedSpace();
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    expect(await screen.findByText(/no citations yet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/import a .bib or add one manually/i),
    ).toBeInTheDocument();
  });

  it('renders empty-search variant when some citations exist but none match', async () => {
    await seedSpace();
    await db.citations.put(citation());
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    await screen.findAllByText('On testing');
    const search = screen.getByPlaceholderText(/authors, tags, year/i);
    await userEvent.type(search, 'no-match-zzz');
    await waitFor(() =>
      expect(screen.getByText(/no rows match your search/i)).toBeInTheDocument(),
    );
  });

  it('renders compact density without TAG/TYPE/USED columns', async () => {
    await seedSpace();
    await db.citations.put(citation());
    renderWithProviders(
      <CitationsPane spaceId="s1" spaceName="Test" density="compact" />,
    );
    await screen.findAllByText('On testing');
    expect(screen.queryByText('TAG')).not.toBeInTheDocument();
    expect(screen.queryByText('TYPE')).not.toBeInTheDocument();
    expect(screen.queryByText(/^USED$/)).not.toBeInTheDocument();
  });

  it('toggles add form and submits a plain-text title that becomes a manual citation', async () => {
    await seedSpace();
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    await userEvent.click(screen.getByText('+ add'));
    const textarea = await screen.findByRole('textbox');
    await userEvent.type(textarea, 'A New Paper');
    await userEvent.click(screen.getByText(/^add citation$/));
    await waitFor(async () => {
      const rows = await db.citations.toArray();
      expect(rows).toHaveLength(1);
      expect(rows[0].title).toBe('A New Paper');
      expect(rows[0].authors).toBe('(unknown)');
    });
  });

  it('keeps the submit button disabled while the textarea is empty', async () => {
    await seedSpace();
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    await userEvent.click(screen.getByText('+ add'));
    expect(screen.getByText(/^add citation$/)).toBeDisabled();
  });

  it('imports a pasted bibtex entry and clears the form', async () => {
    await seedSpace();
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    await userEvent.click(screen.getByText('+ add'));
    const textarea = (await screen.findByRole('textbox')) as HTMLTextAreaElement;
    fireEvent.change(textarea, {
      target: {
        value:
          '@article{key1, author = {Doe, J.}, title = {Hi}, year = {2024}}',
      },
    });
    await userEvent.click(screen.getByText(/^add citation$/));
    await waitFor(async () => {
      const rows = await db.citations.toArray();
      expect(rows.length).toBeGreaterThan(0);
    });
  });

  it('uploads a .bib file via the hidden file input', async () => {
    await seedSpace();
    const { container } = renderWithProviders(
      <CitationsPane spaceId="s1" spaceName="Test" />,
    );
    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(
      [
        '@book{frost1916, author = {Frost, R.}, title = {Mountain Interval}, year = {1916}}',
      ],
      'sources.bib',
      { type: 'application/x-bibtex' },
    );
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() =>
      expect(screen.getByRole('status')).toBeInTheDocument(),
    );
  });

  it('shows an error status when the uploaded file is invalid', async () => {
    await seedSpace();
    const { container } = renderWithProviders(
      <CitationsPane spaceId="s1" spaceName="Test" />,
    );
    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const bad = new File(['not bibtex content'], 'bad.bib', {
      type: 'application/x-bibtex',
    });
    fireEvent.change(fileInput, { target: { files: [bad] } });
    await waitFor(() =>
      expect(screen.getByRole('status')).toBeInTheDocument(),
    );
    errSpy.mockRestore();
  });

  it('disables the export button when there are no citations', async () => {
    await seedSpace();
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    expect(
      await screen.findByRole('button', { name: /export as \.bib/i }),
    ).toBeDisabled();
  });

  it('triggers a download when export is clicked with citations present', async () => {
    await seedSpace();
    await db.citations.put(citation());
    if (!('createObjectURL' in URL)) {
      (URL as unknown as { createObjectURL: () => string }).createObjectURL =
        () => '';
    }
    if (!('revokeObjectURL' in URL)) {
      (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL =
        () => {};
    }
    const createSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:mock');
    const revokeSpy = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {});
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    await screen.findAllByText('On testing');
    await userEvent.click(
      screen.getByRole('button', { name: /export as \.bib/i }),
    );
    expect(createSpy).toHaveBeenCalled();
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock');
    createSpy.mockRestore();
    revokeSpy.mockRestore();
  });

  it('clicking a row expands a read-only detail view (no inputs until edit)', async () => {
    await seedSpace();
    await db.citations.put(citation());
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    const row = await screen.findByRole('button', {
      name: /view citation smith2020/i,
    });
    await userEvent.click(row);
    expect(
      await screen.findByTestId('citation-detail-c-base'),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^edit$/i }),
    ).toBeInTheDocument();
  });

  it('expanding then editing a row saves changes and returns to detail view', async () => {
    await seedSpace();
    await db.citations.put(citation());
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    await userEvent.click(
      await screen.findByRole('button', { name: /view citation smith2020/i }),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: /^edit$/i }),
    );
    const titleInput = await screen.findByLabelText('Title');
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Revised title');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(async () => {
      const updated = await db.citations.get('c-base');
      expect(updated?.title).toBe('Revised title');
    });
    expect(await screen.findByText(/updated 1 citation/i)).toBeInTheDocument();
    expect(
      await screen.findByTestId('citation-detail-c-base'),
    ).toBeInTheDocument();
  });

  it('escape key cancels an in-progress edit without persisting', async () => {
    await seedSpace();
    await db.citations.put(citation());
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    await userEvent.click(
      await screen.findByRole('button', { name: /view citation smith2020/i }),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: /^edit$/i }),
    );
    const titleInput = await screen.findByLabelText('Title');
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Should not stick');
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByLabelText('Title')).not.toBeInTheDocument(),
    );
    expect(
      screen.getByTestId('citation-detail-c-base'),
    ).toBeInTheDocument();
    const persisted = await db.citations.get('c-base');
    expect(persisted?.title).toBe('On testing');
  });

  it('blocks save when the new tag collides with another citation in the same space', async () => {
    await seedSpace();
    await db.citations.bulkPut([
      citation(),
      citation({ id: 'c-other', key: 'jones2021', title: 'Other paper' }),
    ]);
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    await userEvent.click(
      await screen.findByRole('button', { name: /view citation smith2020/i }),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: /^edit$/i }),
    );
    const tagInput = await screen.findByLabelText('Tag');
    await userEvent.clear(tagInput);
    await userEvent.type(tagInput, 'jones2021');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(
      await screen.findByText(/tag "jones2021" is already used in this space/i),
    ).toBeInTheDocument();
    const unchanged = await db.citations.get('c-base');
    expect(unchanged?.key).toBe('smith2020');
  });

  it('bulk-deletes selected rows after confirmation', async () => {
    await seedSpace();
    await db.citations.bulkPut([
      citation({ id: 'c1', key: 'k1', title: 'One' }),
      citation({ id: 'c2', key: 'k2', title: 'Two' }),
      citation({ id: 'c3', key: 'k3', title: 'Three' }),
    ]);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    await screen.findByRole('button', { name: /view citation k1/i });
    await userEvent.click(screen.getByLabelText('Select citation k1'));
    await userEvent.click(screen.getByLabelText('Select citation k2'));
    const bulkBar = await screen.findByRole('region', {
      name: /bulk actions/i,
    });
    await userEvent.click(
      within(bulkBar).getByRole('button', { name: /^delete$/i }),
    );
    await waitFor(async () => {
      const rows = await db.citations.toArray();
      expect(rows.map((r) => r.id).sort()).toEqual(['c3']);
    });
    expect(confirmSpy).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('bulk-sets the type on selected rows', async () => {
    await seedSpace();
    await db.citations.bulkPut([
      citation({ id: 'c1', key: 'k1', type: 'misc' }),
      citation({ id: 'c2', key: 'k2', type: 'misc' }),
    ]);
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    await screen.findByRole('button', { name: /view citation k1/i });
    await userEvent.click(screen.getByLabelText('Select citation k1'));
    await userEvent.click(screen.getByLabelText('Select citation k2'));
    const typeSelect = await screen.findByLabelText(
      /set type for selected citations/i,
    );
    await userEvent.selectOptions(typeSelect, 'book');
    await waitFor(async () => {
      const rows = await db.citations.toArray();
      expect(rows.every((r) => r.type === 'book')).toBe(true);
    });
  });

  it('deleting a single citation from the detail view removes it from the database', async () => {
    await seedSpace();
    await db.citations.put(citation());
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    await userEvent.click(
      await screen.findByRole('button', { name: /view citation smith2020/i }),
    );
    const detail = await screen.findByTestId('citation-detail-c-base');
    await userEvent.click(
      within(detail).getByRole('button', { name: /^delete$/i }),
    );
    await waitFor(async () => {
      const rows = await db.citations.toArray();
      expect(rows).toHaveLength(0);
    });
    confirmSpy.mockRestore();
  });

  it('copy-tag button writes the citation key to the clipboard and shows confirmation', async () => {
    await seedSpace();
    await db.citations.put(citation());
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    await userEvent.click(
      await screen.findByRole('button', { name: /view citation smith2020/i }),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: /^copy tag smith2020$/i }),
    );
    expect(writeText).toHaveBeenCalledWith('smith2020');
    expect(
      await screen.findByRole('button', { name: /^copied tag smith2020$/i }),
    ).toBeInTheDocument();
  });

  it('the close (×) button collapses an expanded row back to the list view', async () => {
    await seedSpace();
    await db.citations.put(citation());
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    await userEvent.click(
      await screen.findByRole('button', { name: /view citation smith2020/i }),
    );
    expect(
      await screen.findByTestId('citation-detail-c-base'),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: /collapse citation smith2020/i }),
    );
    await waitFor(() =>
      expect(
        screen.queryByTestId('citation-detail-c-base'),
      ).not.toBeInTheDocument(),
    );
    expect(
      await screen.findByRole('button', { name: /view citation smith2020/i }),
    ).toBeInTheDocument();
  });

  it('paginates when more than one page of citations is present', async () => {
    await seedSpace();
    const many: Citation[] = Array.from({ length: 30 }, (_, i) => ({
      id: `c-${i}`,
      spaceId: 's1',
      key: `key${i}`,
      authors: `Author ${i}`,
      title: `Title ${i}`,
      year: 2000 + i,
      type: 'article',
      useCount: 0,
    }));
    await db.citations.bulkPut(many);
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    expect(await screen.findByText('1/2')).toBeInTheDocument();
    const next = screen.getByRole('button', { name: /next page/i });
    await userEvent.click(next);
    await waitFor(() => expect(screen.getByText('2/2')).toBeInTheDocument());
    const prev = screen.getByRole('button', { name: /previous page/i });
    await userEvent.click(prev);
    await waitFor(() => expect(screen.getByText('1/2')).toBeInTheDocument());
  });
});
