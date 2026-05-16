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

  it('cmd/ctrl+Enter on the edit row commits the save without clicking the button', async () => {
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
    await userEvent.type(titleInput, 'Saved by shortcut');
    // Cmd/Ctrl+Enter on the form area triggers the save
    fireEvent.keyDown(
      screen.getByTestId('citation-edit-c-base'),
      { key: 'Enter', ctrlKey: true },
    );
    await waitFor(async () => {
      const updated = await db.citations.get('c-base');
      expect(updated?.title).toBe('Saved by shortcut');
    });
  });

  it('Enter activates a collapsed citation row via keyboard', async () => {
    await seedSpace();
    await db.citations.put(citation());
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    const row = await screen.findByRole('button', {
      name: /view citation smith2020/i,
    });
    row.focus();
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(
      await screen.findByTestId('citation-detail-c-base'),
    ).toBeInTheDocument();
  });

  it('Space activates a collapsed citation row via keyboard', async () => {
    await seedSpace();
    await db.citations.put(citation());
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    const row = await screen.findByRole('button', {
      name: /view citation smith2020/i,
    });
    row.focus();
    fireEvent.keyDown(row, { key: ' ' });
    expect(
      await screen.findByTestId('citation-detail-c-base'),
    ).toBeInTheDocument();
  });

  it('declining the bulk-delete confirmation leaves rows intact', async () => {
    await seedSpace();
    await db.citations.bulkPut([
      citation({ id: 'c1', key: 'k1' }),
      citation({ id: 'c2', key: 'k2' }),
    ]);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    await screen.findByRole('button', { name: /view citation k1/i });
    await userEvent.click(screen.getByLabelText('Select citation k1'));
    const bulkBar = await screen.findByRole('region', {
      name: /bulk actions/i,
    });
    await userEvent.click(
      within(bulkBar).getByRole('button', { name: /^delete$/i }),
    );
    expect(confirmSpy).toHaveBeenCalled();
    expect((await db.citations.toArray()).map((r) => r.id).sort()).toEqual([
      'c1',
      'c2',
    ]);
    confirmSpy.mockRestore();
  });

  it('declining the single-row delete confirmation leaves the row intact', async () => {
    await seedSpace();
    await db.citations.put(citation());
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    await userEvent.click(
      await screen.findByRole('button', { name: /view citation smith2020/i }),
    );
    const detail = await screen.findByTestId('citation-detail-c-base');
    await userEvent.click(
      within(detail).getByRole('button', { name: /^delete$/i }),
    );
    expect(confirmSpy).toHaveBeenCalled();
    expect(await db.citations.get('c-base')).toBeDefined();
    confirmSpy.mockRestore();
  });

  it('uses the high-usage prompt when deleting a citation referenced by documents', async () => {
    await seedSpace();
    await db.citations.put(citation({ useCount: 3 }));
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    await userEvent.click(
      await screen.findByRole('button', { name: /view citation smith2020/i }),
    );
    const detail = await screen.findByTestId('citation-detail-c-base');
    await userEvent.click(
      within(detail).getByRole('button', { name: /^delete$/i }),
    );
    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringMatching(/used 3× in your documents/i),
    );
    confirmSpy.mockRestore();
  });

  it('a file upload with a duplicate key reports the skipped count in the status', async () => {
    await seedSpace();
    // existing citation with the same key as the bibtex entry we will upload
    await db.citations.put(citation({ id: 'c-existing', key: 'frost1916' }));
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
      expect(screen.getByRole('status').textContent).toMatch(
        /skipped 1 duplicate/i,
      ),
    );
  });

  it('non-numeric year input is coerced to 0 when saving the edit row', async () => {
    await seedSpace();
    await db.citations.put(citation({ year: 2020 }));
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    await userEvent.click(
      await screen.findByRole('button', { name: /view citation smith2020/i }),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: /^edit$/i }),
    );
    const yearInput = await screen.findByLabelText('Year');
    await userEvent.clear(yearInput);
    await userEvent.type(yearInput, 'abc');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(async () => {
      const updated = await db.citations.get('c-base');
      expect(updated?.year).toBe(0);
    });
  });

  it('blank year input is also persisted as 0', async () => {
    await seedSpace();
    await db.citations.put(citation({ year: 2020 }));
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    await userEvent.click(
      await screen.findByRole('button', { name: /view citation smith2020/i }),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: /^edit$/i }),
    );
    const yearInput = await screen.findByLabelText('Year');
    await userEvent.clear(yearInput);
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(async () => {
      const updated = await db.citations.get('c-base');
      expect(updated?.year).toBe(0);
    });
  });

  it('clearing all required fields on an edit row falls back to placeholders on save', async () => {
    await seedSpace();
    await db.citations.put(citation());
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    await userEvent.click(
      await screen.findByRole('button', { name: /view citation smith2020/i }),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: /^edit$/i }),
    );
    await userEvent.clear(await screen.findByLabelText('Tag'));
    await userEvent.clear(await screen.findByLabelText('Title'));
    await userEvent.clear(await screen.findByLabelText('Authors'));
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(async () => {
      const updated = await db.citations.get('c-base');
      // Tag falls back to the original key, title to "(untitled)", authors to "(unknown)"
      expect(updated?.key).toBe('smith2020');
      expect(updated?.title).toBe('(untitled)');
      expect(updated?.authors).toBe('(unknown)');
    });
  });

  it('the bulk type-select resets to the placeholder after a selection is applied', async () => {
    await seedSpace();
    await db.citations.bulkPut([
      citation({ id: 'c1', key: 'k1', type: 'misc' }),
    ]);
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    await screen.findByRole('button', { name: /view citation k1/i });
    await userEvent.click(screen.getByLabelText('Select citation k1'));
    const typeSelect = (await screen.findByLabelText(
      /set type for selected citations/i,
    )) as HTMLSelectElement;
    await userEvent.selectOptions(typeSelect, 'book');
    // After applying, the visual value is cleared (currentTarget.value = '')
    await waitFor(() => expect(typeSelect.value).toBe(''));
  });

  it('surfaces an error status when db.citations.update throws during edit save', async () => {
    await seedSpace();
    await db.citations.put(citation());
    const updateSpy = vi
      .spyOn(db.citations, 'update')
      .mockRejectedValue(new Error('boom'));
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    await userEvent.click(
      await screen.findByRole('button', { name: /view citation smith2020/i }),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: /^edit$/i }),
    );
    const titleInput = await screen.findByLabelText('Title');
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Changed');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toMatch(/failed.*boom/i),
    );
    updateSpy.mockRestore();
  });

  it('surfaces an error in the manual-add form when the underlying parse fails', async () => {
    await seedSpace();
    const addSpy = vi
      .spyOn(db.citations, 'add')
      .mockRejectedValue(new Error('disk full'));
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    await userEvent.click(screen.getByText('+ add'));
    const textarea = await screen.findByRole('textbox');
    await userEvent.type(textarea, 'plain title');
    await userEvent.click(screen.getByText(/^add citation$/));
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toMatch(
        /failed.*disk full/i,
      ),
    );
    addSpy.mockRestore();
  });

  it('manual-add does nothing when the textarea is whitespace-only and the button stays disabled', async () => {
    await seedSpace();
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    await userEvent.click(screen.getByText('+ add'));
    const textarea = (await screen.findByRole('textbox')) as HTMLTextAreaElement;
    await userEvent.type(textarea, '   ');
    expect(screen.getByText(/^add citation$/)).toBeDisabled();
  });

  it('select-all checkbox selects every row on the page, then unselects them on a second click', async () => {
    await seedSpace();
    await db.citations.bulkPut([
      citation({ id: 'c1', key: 'k1' }),
      citation({ id: 'c2', key: 'k2' }),
      citation({ id: 'c3', key: 'k3' }),
    ]);
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    const selectAll = (await screen.findByLabelText(
      /select all citations on this page/i,
    )) as HTMLInputElement;
    await userEvent.click(selectAll);
    await waitFor(() =>
      expect(
        screen.getByText(/^3 selected$/i, {
          selector: 'span',
        }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(selectAll);
    await waitFor(() =>
      expect(screen.queryByText(/^3 selected$/i)).not.toBeInTheDocument(),
    );
  });

  it('selects a subset of rows on a page and select-all toggles to "all selected" on next click', async () => {
    await seedSpace();
    await db.citations.bulkPut([
      citation({ id: 'c1', key: 'k1' }),
      citation({ id: 'c2', key: 'k2' }),
    ]);
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    await screen.findByRole('button', { name: /view citation k1/i });
    await userEvent.click(screen.getByLabelText('Select citation k1'));
    expect(screen.getByText(/^1 selected$/i)).toBeInTheDocument();
    // Now the page-level checkbox is in an indeterminate state. Clicking it
    // selects the remaining rows.
    await userEvent.click(
      screen.getByLabelText(/select all citations on this page/i),
    );
    await waitFor(() =>
      expect(screen.getByText(/^2 selected$/i)).toBeInTheDocument(),
    );
  });

  it('the "clear" button in the bulk bar wipes the current selection', async () => {
    await seedSpace();
    await db.citations.put(citation({ id: 'c1', key: 'k1' }));
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    await screen.findByRole('button', { name: /view citation k1/i });
    await userEvent.click(screen.getByLabelText('Select citation k1'));
    const bulkBar = await screen.findByRole('region', {
      name: /bulk actions/i,
    });
    await userEvent.click(
      within(bulkBar).getByRole('button', { name: /^clear$/i }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: /bulk actions/i })).not.toBeInTheDocument(),
    );
  });

  it('deleting a citation with useCount > 0 uses the "used N×" confirm prompt', async () => {
    await seedSpace();
    await db.citations.put(citation({ useCount: 5 }));
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    await userEvent.click(
      await screen.findByRole('button', { name: /view citation smith2020/i }),
    );
    const detail = await screen.findByTestId('citation-detail-c-base');
    await userEvent.click(
      within(detail).getByRole('button', { name: /^delete$/i }),
    );
    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringMatching(/used 5× in your documents/i),
    );
    confirmSpy.mockRestore();
  });

  it('surfaces an error in delete when db.citations.delete throws', async () => {
    await seedSpace();
    await db.citations.put(citation());
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const delSpy = vi
      .spyOn(db.citations, 'delete')
      .mockRejectedValue(new Error('locked'));
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    await userEvent.click(
      await screen.findByRole('button', { name: /view citation smith2020/i }),
    );
    const detail = await screen.findByTestId('citation-detail-c-base');
    await userEvent.click(
      within(detail).getByRole('button', { name: /^delete$/i }),
    );
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toMatch(
        /failed.*locked/i,
      ),
    );
    delSpy.mockRestore();
    confirmSpy.mockRestore();
  });

  it('deleting from the edit row removes the citation (covers edit-row onDelete branch)', async () => {
    await seedSpace();
    await db.citations.put(citation());
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    await userEvent.click(
      await screen.findByRole('button', { name: /view citation smith2020/i }),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: /^edit$/i }),
    );
    const editRow = await screen.findByTestId('citation-edit-c-base');
    await userEvent.click(
      within(editRow).getByRole('button', { name: /^delete$/i }),
    );
    await waitFor(async () => {
      expect(await db.citations.count()).toBe(0);
    });
    confirmSpy.mockRestore();
  });

  it('toggle-select checkbox inside the detail row marks the row selected', async () => {
    await seedSpace();
    await db.citations.put(citation());
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    await userEvent.click(
      await screen.findByRole('button', { name: /view citation smith2020/i }),
    );
    const detail = await screen.findByTestId('citation-detail-c-base');
    // The detail row has its own checkbox with aria-label = "Select citation X"
    await userEvent.click(
      within(detail).getByLabelText('Select citation smith2020'),
    );
    expect(
      await screen.findByRole('region', { name: /bulk actions/i }),
    ).toBeInTheDocument();
  });

  it('changing the type in the edit-row select persists on save', async () => {
    await seedSpace();
    await db.citations.put(citation({ type: 'article' }));
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    await userEvent.click(
      await screen.findByRole('button', { name: /view citation smith2020/i }),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: /^edit$/i }),
    );
    const typeSelect = (await screen.findByLabelText('Type')) as HTMLSelectElement;
    await userEvent.selectOptions(typeSelect, 'chapter');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(async () => {
      const updated = await db.citations.get('c-base');
      expect(updated?.type).toBe('chapter');
    });
  });

  it('select-all checkbox is disabled when no rows are visible (empty page)', async () => {
    await seedSpace();
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    const selectAll = await screen.findByLabelText(
      /select all citations on this page/i,
    );
    expect(selectAll).toBeDisabled();
  });

  it('deleting a selected citation also removes it from the selection set', async () => {
    await seedSpace();
    await db.citations.put(citation());
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderWithProviders(<CitationsPane spaceId="s1" spaceName="Test" />);
    // Select the row first (so the BulkBar shows up)
    await userEvent.click(
      await screen.findByLabelText('Select citation smith2020'),
    );
    expect(
      await screen.findByRole('region', { name: /bulk actions/i }),
    ).toBeInTheDocument();
    // Now expand and delete it from the detail view
    await userEvent.click(
      screen.getByRole('button', { name: /view citation smith2020/i }),
    );
    const detail = await screen.findByTestId('citation-detail-c-base');
    await userEvent.click(
      within(detail).getByRole('button', { name: /^delete$/i }),
    );
    await waitFor(async () => {
      expect(await db.citations.count()).toBe(0);
    });
    // BulkBar should be gone — the selection set is empty.
    expect(
      screen.queryByRole('region', { name: /bulk actions/i }),
    ).not.toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  it('clicking the "upload .bib" button delegates to the hidden file input', async () => {
    await seedSpace();
    const { container } = renderWithProviders(
      <CitationsPane spaceId="s1" spaceName="Test" />,
    );
    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click').mockImplementation(() => {});
    await userEvent.click(screen.getByText(/upload \.bib/i));
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('file upload shows "unknown error" when the thrown value is not an Error instance', async () => {
    await seedSpace();
    // Force File.prototype.text to throw a non-Error rejection
    const original = (File.prototype as unknown as { text: () => Promise<string> }).text;
    (File.prototype as unknown as { text: () => Promise<string> }).text = () =>
      Promise.reject('plain string fail');
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = renderWithProviders(
      <CitationsPane spaceId="s1" spaceName="Test" />,
    );
    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(['anything'], 'x.bib', {
      type: 'application/x-bibtex',
    });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toMatch(/unknown error/i),
    );
    (File.prototype as unknown as { text: () => Promise<string> }).text = original;
    errSpy.mockRestore();
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
