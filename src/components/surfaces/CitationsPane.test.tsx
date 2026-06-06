import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import { sampleSpace } from '@/test/fixtures';
import type { Citation } from '@/db/schema';
import { CitationsPane } from './CitationsPane';

const citation = (overrides: Partial<Citation> = {}): Citation => {
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
};

const seedSpace = async () => {
  await db.spaces.put(sampleSpace);
};

const renderPane = (
  props: Partial<React.ComponentProps<typeof CitationsPane>> = {},
) =>
  renderWithProviders(
    <CitationsPane spaceId="s1" spaceName="Test" {...props} />,
  );

describe('CitationsPane', () => {
  describe('rendering', () => {
    it('should render the empty state when no citations exist', async () => {
      await seedSpace();
      renderPane();
      const empty = await screen.findByTestId('citations-empty');
      expect(empty).toHaveTextContent(/no citations yet/i);
      expect(screen.getByTestId('citations-empty-hint')).toHaveTextContent(
        /import a \.bib or add one manually/i,
      );
    });

    it('should render the empty-search variant when some citations exist but none match', async () => {
      await seedSpace();
      await db.citations.put(citation());
      renderPane();
      await screen.findByTestId('citation-row-c-base');
      const search = screen.getByTestId('citations-search');
      expect(search).toHaveAttribute('placeholder', 'authors, tags, year…');
      await userEvent.type(search, 'no-match-zzz');
      await waitFor(() =>
        expect(screen.getByTestId('citations-empty-hint')).toHaveTextContent(
          /no rows match your search/i,
        ),
      );
    });

    it('should render compact density without TAG/TYPE/USED columns', async () => {
      await seedSpace();
      await db.citations.put(citation());
      renderPane({ density: 'compact' });
      await screen.findByTestId('citation-row-c-base');
      expect(
        screen.queryByTestId('citation-row-c-base-tag'),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('citation-row-c-base-type'),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('citation-row-c-base-used'),
      ).not.toBeInTheDocument();
    });
  });

  describe('manual add form', () => {
    it('should toggle the form and submit a plain-text title as a manual citation', async () => {
      await seedSpace();
      renderPane();
      await userEvent.click(screen.getByTestId('citations-add-toggle'));
      const textarea = await screen.findByTestId(
        'citations-manual-add-input',
      );
      await userEvent.type(textarea, 'A New Paper');
      await userEvent.click(
        screen.getByTestId('citations-manual-add-submit'),
      );
      await waitFor(async () => {
        const rows = await db.citations.toArray();
        expect(rows).toHaveLength(1);
        expect(rows[0].title).toBe('A New Paper');
        expect(rows[0].authors).toBe('(unknown)');
      });
    });

    it('should keep the submit button disabled while the textarea is empty', async () => {
      await seedSpace();
      renderPane();
      await userEvent.click(screen.getByTestId('citations-add-toggle'));
      expect(
        await screen.findByTestId('citations-manual-add-submit'),
      ).toBeDisabled();
    });

    it('should import a pasted bibtex entry and clear the form', async () => {
      await seedSpace();
      renderPane();
      await userEvent.click(screen.getByTestId('citations-add-toggle'));
      const textarea = (await screen.findByTestId(
        'citations-manual-add-input',
      ));
      fireEvent.change(textarea, {
        target: {
          value:
            '@article{key1, author = {Doe, J.}, title = {Hi}, year = {2024}}',
        },
      });
      await userEvent.click(
        screen.getByTestId('citations-manual-add-submit'),
      );
      await waitFor(async () => {
        const rows = await db.citations.toArray();
        expect(rows.length).toBeGreaterThan(0);
      });
    });

    it('should do nothing when the textarea is whitespace-only and keep the button disabled', async () => {
      await seedSpace();
      renderPane();
      await userEvent.click(screen.getByTestId('citations-add-toggle'));
      const textarea = (await screen.findByTestId(
        'citations-manual-add-input',
      ));
      await userEvent.type(textarea, '   ');
      expect(
        screen.getByTestId('citations-manual-add-submit'),
      ).toBeDisabled();
    });

    it('should surface an error in the manual-add form when the underlying parse fails', async () => {
      await seedSpace();
      const addSpy = vi
        .spyOn(db.citations, 'add')
        .mockRejectedValue(new Error('disk full'));
      renderPane();
      await userEvent.click(screen.getByTestId('citations-add-toggle'));
      const textarea = await screen.findByTestId(
        'citations-manual-add-input',
      );
      await userEvent.type(textarea, 'plain title');
      await userEvent.click(
        screen.getByTestId('citations-manual-add-submit'),
      );
      await waitFor(() =>
        expect(screen.getByTestId('citations-status')).toHaveTextContent(
          /failed.*disk full/i,
        ),
      );
      addSpy.mockRestore();
    });
  });

  describe('file upload', () => {
    it('should upload a .bib file via the hidden file input', async () => {
      await seedSpace();
      renderPane();
      const fileInput = screen.getByTestId(
        'citations-file-input',
      );
      const file = new File(
        [
          '@book{frost1916, author = {Frost, R.}, title = {Mountain Interval}, year = {1916}}',
        ],
        'sources.bib',
        { type: 'application/x-bibtex' },
      );
      fireEvent.change(fileInput, { target: { files: [file] } });
      await waitFor(() =>
        expect(screen.getByTestId('citations-status')).toBeInTheDocument(),
      );
    });

    it('should show an error status when the uploaded file is invalid', async () => {
      await seedSpace();
      renderPane();
      const fileInput = screen.getByTestId(
        'citations-file-input',
      );
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const bad = new File(['not bibtex content'], 'bad.bib', {
        type: 'application/x-bibtex',
      });
      fireEvent.change(fileInput, { target: { files: [bad] } });
      await waitFor(() =>
        expect(screen.getByTestId('citations-status')).toBeInTheDocument(),
      );
      errSpy.mockRestore();
    });

    it('should report the skipped count in the status when a duplicate key is uploaded', async () => {
      await seedSpace();
      await db.citations.put(citation({ id: 'c-existing', key: 'frost1916' }));
      renderPane();
      const fileInput = screen.getByTestId(
        'citations-file-input',
      );
      const file = new File(
        [
          '@book{frost1916, author = {Frost, R.}, title = {Mountain Interval}, year = {1916}}',
        ],
        'sources.bib',
        { type: 'application/x-bibtex' },
      );
      fireEvent.change(fileInput, { target: { files: [file] } });
      await waitFor(() =>
        expect(screen.getByTestId('citations-status')).toHaveTextContent(
          /skipped 1 duplicate/i,
        ),
      );
    });

    it('should show "unknown error" when the thrown value is not an Error instance', async () => {
      await seedSpace();
      const proto = File.prototype as unknown as { text: () => Promise<string> };
      const original = proto.text;
      // vi.spyOn cannot replace a non-configurable prototype method on every jsdom
      // version, so we mutate the prototype directly. Wrap in try/finally so a
      // failed assertion never leaks the broken text() into the next test.
      proto.text = () => Promise.reject('plain string fail');
      try {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        renderPane();
        const fileInput = screen.getByTestId('citations-file-input');
        const file = new File(['anything'], 'x.bib', {
          type: 'application/x-bibtex',
        });
        fireEvent.change(fileInput, { target: { files: [file] } });
        await waitFor(() =>
          expect(screen.getByTestId('citations-status')).toHaveTextContent(
            /unknown error/i,
          ),
        );
      } finally {
        proto.text = original;
      }
    });

    it('should delegate to the hidden file input when the upload button is clicked', async () => {
      await seedSpace();
      renderPane();
      const fileInput = screen.getByTestId(
        'citations-file-input',
      );
      const clickSpy = vi
        .spyOn(fileInput, 'click')
        .mockImplementation(() => {});
      await userEvent.click(screen.getByTestId('citations-upload'));
      expect(clickSpy).toHaveBeenCalled();
      clickSpy.mockRestore();
    });
  });

  describe('export', () => {
    it('should disable the export button when there are no citations', async () => {
      await seedSpace();
      renderPane();
      expect(await screen.findByTestId('citations-export')).toBeDisabled();
    });

    it('should trigger a download when export is clicked with citations present', async () => {
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
      renderPane();
      await screen.findByTestId('citation-row-c-base');
      await userEvent.click(screen.getByTestId('citations-export'));
      expect(createSpy).toHaveBeenCalled();
      expect(revokeSpy).toHaveBeenCalledWith('blob:mock');
      createSpy.mockRestore();
      revokeSpy.mockRestore();
    });
  });

  describe('detail row', () => {
    it('should expand a row into a read-only detail view (no inputs until edit)', async () => {
      await seedSpace();
      await db.citations.put(citation());
      renderPane();
      const row = await screen.findByTestId('citation-row-c-base');
      expect(row).toHaveAttribute('aria-label', 'View citation smith2020');
      await userEvent.click(row);
      const detail = await screen.findByTestId('citation-detail-c-base');
      expect(detail).toHaveTextContent('On testing');
      expect(
        screen.queryByTestId('citation-edit-c-base'),
      ).not.toBeInTheDocument();
      expect(
        screen.getByTestId('citation-detail-c-base-edit'),
      ).toHaveTextContent(/edit/i);
    });

    it('should collapse an expanded row back to the list when the close button is clicked', async () => {
      await seedSpace();
      await db.citations.put(citation());
      renderPane();
      await userEvent.click(await screen.findByTestId('citation-row-c-base'));
      expect(
        await screen.findByTestId('citation-detail-c-base'),
      ).toBeInTheDocument();
      await userEvent.click(
        screen.getByTestId('citation-detail-c-base-close'),
      );
      await waitFor(() =>
        expect(
          screen.queryByTestId('citation-detail-c-base'),
        ).not.toBeInTheDocument(),
      );
      expect(
        await screen.findByTestId('citation-row-c-base'),
      ).toBeInTheDocument();
    });

    it('should write the citation key to the clipboard and confirm via the copy button label', async () => {
      await seedSpace();
      await db.citations.put(citation());
      const writeText = vi.fn().mockResolvedValue(undefined);
      // navigator.clipboard isn't a vi.spyOn target (jsdom doesn't expose it by
      // default), so capture the original descriptor and restore it in finally
      // — otherwise the stub leaks into every later test in this worker.
      const originalDescriptor = Object.getOwnPropertyDescriptor(
        navigator,
        'clipboard',
      );
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText },
      });
      try {
        renderPane();
        await userEvent.click(await screen.findByTestId('citation-row-c-base'));
        const copyBtn = await screen.findByTestId(
          'citation-detail-c-base-copy',
        );
        expect(copyBtn).toHaveAttribute('aria-label', 'Copy tag smith2020');
        await userEvent.click(copyBtn);
        expect(writeText).toHaveBeenCalledWith('smith2020');
        await waitFor(() =>
          expect(
            screen.getByTestId('citation-detail-c-base-copy'),
          ).toHaveAttribute('aria-label', 'Copied tag smith2020'),
        );
      } finally {
        if (originalDescriptor) {
          Object.defineProperty(navigator, 'clipboard', originalDescriptor);
        } else {
          delete (navigator as unknown as { clipboard?: unknown }).clipboard;
        }
      }
    });

    it('should toggle the bulk bar on when the detail row select checkbox is clicked', async () => {
      await seedSpace();
      await db.citations.put(citation());
      renderPane();
      await userEvent.click(await screen.findByTestId('citation-row-c-base'));
      await userEvent.click(
        screen.getByTestId('citation-detail-c-base-select'),
      );
      expect(
        await screen.findByTestId('citations-bulk-bar'),
      ).toBeInTheDocument();
    });

    it('should delete a single citation from the detail view', async () => {
      await seedSpace();
      await db.citations.put(citation());
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      renderPane();
      await userEvent.click(await screen.findByTestId('citation-row-c-base'));
      await userEvent.click(
        screen.getByTestId('citation-detail-c-base-delete'),
      );
      await waitFor(async () => {
        expect(await db.citations.toArray()).toHaveLength(0);
      });
      confirmSpy.mockRestore();
    });

    it('should leave the row intact when the single-row delete confirmation is declined', async () => {
      await seedSpace();
      await db.citations.put(citation());
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      renderPane();
      await userEvent.click(await screen.findByTestId('citation-row-c-base'));
      await userEvent.click(
        screen.getByTestId('citation-detail-c-base-delete'),
      );
      expect(confirmSpy).toHaveBeenCalled();
      expect(await db.citations.get('c-base')).toBeDefined();
      confirmSpy.mockRestore();
    });

    it('should use the high-usage prompt when deleting a citation referenced by documents', async () => {
      await seedSpace();
      await db.citations.put(citation({ useCount: 3 }));
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      renderPane();
      await userEvent.click(await screen.findByTestId('citation-row-c-base'));
      await userEvent.click(
        screen.getByTestId('citation-detail-c-base-delete'),
      );
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringMatching(/used 3× in your documents/i),
      );
      confirmSpy.mockRestore();
    });

    it('should use the "used N×" confirm prompt when deleting a citation with useCount > 0', async () => {
      await seedSpace();
      await db.citations.put(citation({ useCount: 5 }));
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      renderPane();
      await userEvent.click(await screen.findByTestId('citation-row-c-base'));
      await userEvent.click(
        screen.getByTestId('citation-detail-c-base-delete'),
      );
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringMatching(/used 5× in your documents/i),
      );
      confirmSpy.mockRestore();
    });

    it('should surface an error in the status when db.citations.delete throws', async () => {
      await seedSpace();
      await db.citations.put(citation());
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const delSpy = vi
        .spyOn(db.citations, 'delete')
        .mockRejectedValue(new Error('locked'));
      renderPane();
      await userEvent.click(await screen.findByTestId('citation-row-c-base'));
      await userEvent.click(
        screen.getByTestId('citation-detail-c-base-delete'),
      );
      await waitFor(() =>
        expect(screen.getByTestId('citations-status')).toHaveTextContent(
          /failed.*locked/i,
        ),
      );
      delSpy.mockRestore();
      confirmSpy.mockRestore();
    });

    it('should also remove a deleted citation from the selection set', async () => {
      await seedSpace();
      await db.citations.put(citation());
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      renderPane();
      await userEvent.click(
        await screen.findByTestId('citation-row-c-base-select'),
      );
      expect(
        await screen.findByTestId('citations-bulk-bar'),
      ).toBeInTheDocument();
      await userEvent.click(screen.getByTestId('citation-row-c-base'));
      await userEvent.click(
        screen.getByTestId('citation-detail-c-base-delete'),
      );
      await waitFor(async () => {
        expect(await db.citations.count()).toBe(0);
      });
      expect(
        screen.queryByTestId('citations-bulk-bar'),
      ).not.toBeInTheDocument();
      confirmSpy.mockRestore();
    });
  });

  describe('edit row', () => {
    it('should save changes and return to the detail view', async () => {
      await seedSpace();
      await db.citations.put(citation());
      renderPane();
      await userEvent.click(await screen.findByTestId('citation-row-c-base'));
      await userEvent.click(
        screen.getByTestId('citation-detail-c-base-edit'),
      );
      const titleInput = await screen.findByTestId('citation-edit-c-base-title');
      await userEvent.clear(titleInput);
      await userEvent.type(titleInput, 'Revised title');
      await userEvent.click(screen.getByTestId('citation-edit-c-base-save'));
      await waitFor(async () => {
        const updated = await db.citations.get('c-base');
        expect(updated?.title).toBe('Revised title');
      });
      expect(
        await screen.findByTestId('citations-status'),
      ).toHaveTextContent(/updated 1 citation/i);
      expect(
        await screen.findByTestId('citation-detail-c-base'),
      ).toBeInTheDocument();
    });

    it('should cancel an in-progress edit without persisting when Escape is pressed', async () => {
      await seedSpace();
      await db.citations.put(citation());
      renderPane();
      await userEvent.click(await screen.findByTestId('citation-row-c-base'));
      await userEvent.click(
        screen.getByTestId('citation-detail-c-base-edit'),
      );
      const titleInput = await screen.findByTestId('citation-edit-c-base-title');
      await userEvent.clear(titleInput);
      await userEvent.type(titleInput, 'Should not stick');
      await userEvent.keyboard('{Escape}');
      await waitFor(() =>
        expect(
          screen.queryByTestId('citation-edit-c-base'),
        ).not.toBeInTheDocument(),
      );
      expect(
        screen.getByTestId('citation-detail-c-base'),
      ).toBeInTheDocument();
      const persisted = await db.citations.get('c-base');
      expect(persisted?.title).toBe('On testing');
    });

    it('should block save when the new tag collides with another citation in the same space', async () => {
      await seedSpace();
      await db.citations.bulkPut([
        citation(),
        citation({ id: 'c-other', key: 'jones2021', title: 'Other paper' }),
      ]);
      renderPane();
      await userEvent.click(await screen.findByTestId('citation-row-c-base'));
      await userEvent.click(
        screen.getByTestId('citation-detail-c-base-edit'),
      );
      const tagInput = await screen.findByTestId('citation-edit-c-base-tag');
      await userEvent.clear(tagInput);
      await userEvent.type(tagInput, 'jones2021');
      await userEvent.click(screen.getByTestId('citation-edit-c-base-save'));
      expect(
        await screen.findByTestId('citations-status'),
      ).toHaveTextContent(/tag "jones2021" is already used in this space/i);
      const unchanged = await db.citations.get('c-base');
      expect(unchanged?.key).toBe('smith2020');
    });

    it('should commit the save via cmd/ctrl+Enter on the edit row', async () => {
      await seedSpace();
      await db.citations.put(citation());
      renderPane();
      await userEvent.click(await screen.findByTestId('citation-row-c-base'));
      await userEvent.click(
        screen.getByTestId('citation-detail-c-base-edit'),
      );
      const titleInput = await screen.findByTestId('citation-edit-c-base-title');
      await userEvent.clear(titleInput);
      await userEvent.type(titleInput, 'Saved by shortcut');
      fireEvent.keyDown(screen.getByTestId('citation-edit-c-base'), {
        key: 'Enter',
        ctrlKey: true,
      });
      await waitFor(async () => {
        const updated = await db.citations.get('c-base');
        expect(updated?.title).toBe('Saved by shortcut');
      });
    });

    it('should coerce non-numeric year input to 0 when saving', async () => {
      await seedSpace();
      await db.citations.put(citation({ year: 2020 }));
      renderPane();
      await userEvent.click(await screen.findByTestId('citation-row-c-base'));
      await userEvent.click(
        screen.getByTestId('citation-detail-c-base-edit'),
      );
      const yearInput = await screen.findByTestId('citation-edit-c-base-year');
      await userEvent.clear(yearInput);
      await userEvent.type(yearInput, 'abc');
      await userEvent.click(screen.getByTestId('citation-edit-c-base-save'));
      await waitFor(async () => {
        const updated = await db.citations.get('c-base');
        expect(updated?.year).toBe(0);
      });
    });

    it('should persist a blank year input as 0', async () => {
      await seedSpace();
      await db.citations.put(citation({ year: 2020 }));
      renderPane();
      await userEvent.click(await screen.findByTestId('citation-row-c-base'));
      await userEvent.click(
        screen.getByTestId('citation-detail-c-base-edit'),
      );
      const yearInput = await screen.findByTestId('citation-edit-c-base-year');
      await userEvent.clear(yearInput);
      await userEvent.click(screen.getByTestId('citation-edit-c-base-save'));
      await waitFor(async () => {
        const updated = await db.citations.get('c-base');
        expect(updated?.year).toBe(0);
      });
    });

    it('should fall back to placeholders when all required fields are cleared on save', async () => {
      await seedSpace();
      await db.citations.put(citation());
      renderPane();
      await userEvent.click(await screen.findByTestId('citation-row-c-base'));
      await userEvent.click(
        screen.getByTestId('citation-detail-c-base-edit'),
      );
      await userEvent.clear(
        await screen.findByTestId('citation-edit-c-base-tag'),
      );
      await userEvent.clear(
        await screen.findByTestId('citation-edit-c-base-title'),
      );
      await userEvent.clear(
        await screen.findByTestId('citation-edit-c-base-authors'),
      );
      await userEvent.click(screen.getByTestId('citation-edit-c-base-save'));
      await waitFor(async () => {
        const updated = await db.citations.get('c-base');
        expect(updated?.key).toBe('smith2020');
        expect(updated?.title).toBe('(untitled)');
        expect(updated?.authors).toBe('(unknown)');
      });
    });

    it('should surface an error status when db.citations.update throws during save', async () => {
      await seedSpace();
      await db.citations.put(citation());
      const updateSpy = vi
        .spyOn(db.citations, 'update')
        .mockRejectedValue(new Error('boom'));
      renderPane();
      await userEvent.click(await screen.findByTestId('citation-row-c-base'));
      await userEvent.click(
        screen.getByTestId('citation-detail-c-base-edit'),
      );
      const titleInput = await screen.findByTestId('citation-edit-c-base-title');
      await userEvent.clear(titleInput);
      await userEvent.type(titleInput, 'Changed');
      await userEvent.click(screen.getByTestId('citation-edit-c-base-save'));
      await waitFor(() =>
        expect(screen.getByTestId('citations-status')).toHaveTextContent(
          /failed.*boom/i,
        ),
      );
      updateSpy.mockRestore();
    });

    it('should persist a change to the type select on save', async () => {
      await seedSpace();
      await db.citations.put(citation({ type: 'article' }));
      renderPane();
      await userEvent.click(await screen.findByTestId('citation-row-c-base'));
      await userEvent.click(
        screen.getByTestId('citation-detail-c-base-edit'),
      );
      const typeSelect = (await screen.findByTestId(
        'citation-edit-c-base-type',
      ));
      await userEvent.selectOptions(typeSelect, 'chapter');
      await userEvent.click(screen.getByTestId('citation-edit-c-base-save'));
      await waitFor(async () => {
        const updated = await db.citations.get('c-base');
        expect(updated?.type).toBe('chapter');
      });
    });

    it('should remove the citation when delete is clicked from the edit row', async () => {
      await seedSpace();
      await db.citations.put(citation());
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      renderPane();
      await userEvent.click(await screen.findByTestId('citation-row-c-base'));
      await userEvent.click(
        screen.getByTestId('citation-detail-c-base-edit'),
      );
      await userEvent.click(screen.getByTestId('citation-edit-c-base-delete'));
      await waitFor(async () => {
        expect(await db.citations.count()).toBe(0);
      });
      confirmSpy.mockRestore();
    });
  });

  describe('keyboard activation', () => {
    it('should activate a collapsed row via the Enter key', async () => {
      await seedSpace();
      await db.citations.put(citation());
      renderPane();
      const row = await screen.findByTestId('citation-row-c-base');
      row.focus();
      fireEvent.keyDown(row, { key: 'Enter' });
      expect(
        await screen.findByTestId('citation-detail-c-base'),
      ).toBeInTheDocument();
    });

    it('should activate a collapsed row via the Space key', async () => {
      await seedSpace();
      await db.citations.put(citation());
      renderPane();
      const row = await screen.findByTestId('citation-row-c-base');
      row.focus();
      fireEvent.keyDown(row, { key: ' ' });
      expect(
        await screen.findByTestId('citation-detail-c-base'),
      ).toBeInTheDocument();
    });
  });

  describe('bulk actions', () => {
    it('should bulk-delete selected rows after confirmation', async () => {
      await seedSpace();
      await db.citations.bulkPut([
        citation({ id: 'c1', key: 'k1', title: 'One' }),
        citation({ id: 'c2', key: 'k2', title: 'Two' }),
        citation({ id: 'c3', key: 'k3', title: 'Three' }),
      ]);
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      renderPane();
      await screen.findByTestId('citation-row-c1');
      await userEvent.click(screen.getByTestId('citation-row-c1-select'));
      await userEvent.click(screen.getByTestId('citation-row-c2-select'));
      await screen.findByTestId('citations-bulk-bar');
      await userEvent.click(screen.getByTestId('citations-bulk-delete'));
      await waitFor(async () => {
        const rows = await db.citations.toArray();
        expect(rows.map((r) => r.id).sort()).toEqual(['c3']);
      });
      expect(confirmSpy).toHaveBeenCalled();
      confirmSpy.mockRestore();
    });

    it('should bulk-set the type on selected rows', async () => {
      await seedSpace();
      await db.citations.bulkPut([
        citation({ id: 'c1', key: 'k1', type: 'misc' }),
        citation({ id: 'c2', key: 'k2', type: 'misc' }),
      ]);
      renderPane();
      await screen.findByTestId('citation-row-c1');
      await userEvent.click(screen.getByTestId('citation-row-c1-select'));
      await userEvent.click(screen.getByTestId('citation-row-c2-select'));
      const typeSelect = await screen.findByTestId(
        'citations-bulk-set-type',
      );
      await userEvent.selectOptions(typeSelect, 'book');
      await waitFor(async () => {
        const rows = await db.citations.toArray();
        expect(rows.every((r) => r.type === 'book')).toBe(true);
      });
    });

    it('should reset the bulk type-select to the placeholder after a selection is applied', async () => {
      await seedSpace();
      await db.citations.bulkPut([
        citation({ id: 'c1', key: 'k1', type: 'misc' }),
      ]);
      renderPane();
      await screen.findByTestId('citation-row-c1');
      await userEvent.click(screen.getByTestId('citation-row-c1-select'));
      const typeSelect = (await screen.findByTestId(
        'citations-bulk-set-type',
      ));
      await userEvent.selectOptions(typeSelect, 'book');
      await waitFor(() => { expect(typeSelect.value).toBe(''); });
    });

    it('should leave rows intact when the bulk-delete confirmation is declined', async () => {
      await seedSpace();
      await db.citations.bulkPut([
        citation({ id: 'c1', key: 'k1' }),
        citation({ id: 'c2', key: 'k2' }),
      ]);
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      renderPane();
      await screen.findByTestId('citation-row-c1');
      await userEvent.click(screen.getByTestId('citation-row-c1-select'));
      await screen.findByTestId('citations-bulk-bar');
      await userEvent.click(screen.getByTestId('citations-bulk-delete'));
      expect(confirmSpy).toHaveBeenCalled();
      expect((await db.citations.toArray()).map((r) => r.id).sort()).toEqual([
        'c1',
        'c2',
      ]);
      confirmSpy.mockRestore();
    });

    it('should wipe the current selection when the bulk bar "clear" button is clicked', async () => {
      await seedSpace();
      await db.citations.put(citation({ id: 'c1', key: 'k1' }));
      renderPane();
      await screen.findByTestId('citation-row-c1');
      await userEvent.click(screen.getByTestId('citation-row-c1-select'));
      await screen.findByTestId('citations-bulk-bar');
      await userEvent.click(screen.getByTestId('citations-bulk-clear'));
      await waitFor(() =>
        expect(
          screen.queryByTestId('citations-bulk-bar'),
        ).not.toBeInTheDocument(),
      );
    });
  });

  describe('select-all', () => {
    it('should select every row on the page, then unselect them on a second click', async () => {
      await seedSpace();
      await db.citations.bulkPut([
        citation({ id: 'c1', key: 'k1' }),
        citation({ id: 'c2', key: 'k2' }),
        citation({ id: 'c3', key: 'k3' }),
      ]);
      renderPane();
      const selectAll = (await screen.findByTestId(
        'citations-select-all',
      ));
      expect(selectAll).toHaveAttribute(
        'aria-label',
        'Select all citations on this page',
      );
      await userEvent.click(selectAll);
      await waitFor(() =>
        expect(screen.getByTestId('citations-bulk-bar-count')).toHaveTextContent(
          /^3 selected$/i,
        ),
      );
      await userEvent.click(selectAll);
      await waitFor(() =>
        expect(
          screen.queryByTestId('citations-bulk-bar'),
        ).not.toBeInTheDocument(),
      );
    });

    it('should fill the remaining rows when select-all is clicked on a partial selection', async () => {
      await seedSpace();
      await db.citations.bulkPut([
        citation({ id: 'c1', key: 'k1' }),
        citation({ id: 'c2', key: 'k2' }),
      ]);
      renderPane();
      await screen.findByTestId('citation-row-c1');
      await userEvent.click(screen.getByTestId('citation-row-c1-select'));
      expect(screen.getByTestId('citations-bulk-bar-count')).toHaveTextContent(
        /^1 selected$/i,
      );
      await userEvent.click(screen.getByTestId('citations-select-all'));
      await waitFor(() =>
        expect(screen.getByTestId('citations-bulk-bar-count')).toHaveTextContent(
          /^2 selected$/i,
        ),
      );
    });

    it('should disable select-all when no rows are visible', async () => {
      await seedSpace();
      renderPane();
      expect(await screen.findByTestId('citations-select-all')).toBeDisabled();
    });
  });

  describe('pagination', () => {
    it('should paginate when more than one page of citations is present', async () => {
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
      renderPane();
      expect(
        await screen.findByTestId('citations-page-indicator'),
      ).toHaveTextContent('1/2');
      await userEvent.click(screen.getByTestId('citations-next-page'));
      await waitFor(() =>
        expect(screen.getByTestId('citations-page-indicator')).toHaveTextContent(
          '2/2',
        ),
      );
      await userEvent.click(screen.getByTestId('citations-prev-page'));
      await waitFor(() =>
        expect(screen.getByTestId('citations-page-indicator')).toHaveTextContent(
          '1/2',
        ),
      );
    });
  });

  describe('snapshot', () => {
    it('should match the snapshot across all variants', async () => {
      await seedSpace();
      await db.citations.bulkPut([
        citation({ id: 'c-a', key: 'alpha2020', title: 'Alpha', year: 2020 }),
        citation({
          id: 'c-b',
          key: 'beta2021',
          title: 'Beta',
          year: 2021,
          type: 'book',
          useCount: 2,
        }),
      ]);
      renderPane();
      await screen.findByTestId('citation-row-c-a');
      expect(screen.getByTestId('citations-pane')).toMatchSnapshot();
    });
  });
});
