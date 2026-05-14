import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
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
