import { vi } from 'vitest';
import { serializedBlocks, serializedBody } from '@/test/fixtures';
import { act, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, within } from '@/test/test-utils';
import { useUI, type InspectorSection } from '@/store/ui';
import { db } from '@/db/db';
import type { Doc, Revision } from '@/db/schema';
import { DocInspector } from './DocInspector';

const SECTIONS: InspectorSection[] = ['outline', 'info', 'history', 'actions'];

const makeRevision = (overrides: Partial<Revision>): Revision => ({
  id: overrides.id ?? 'r',
  docId: overrides.docId ?? 'd1',
  body: overrides.body ?? serializedBody('body'),
  text: overrides.text ?? 'body',
  wordCount: overrides.wordCount ?? 1,
  kind: overrides.kind ?? 'auto',
  createdAt: overrides.createdAt ?? Date.now(),
  pinned: overrides.pinned,
  label: overrides.label,
});

const seedDoc = (overrides: Partial<Doc> = {}): Promise<string> =>
  db.docs.put({
    id: 'd1',
    spaceId: 's1',
    sectionId: 'sec1',
    name: 'Doc',
    body: serializedBody('Hello world'),
    meta: { wordCount: 2 },
    updatedAt: Date.now(),
    ...overrides,
  });

describe('DocInspector', () => {
  beforeEach(async () => {
    await db.docs.clear();
    await db.revisions.clear();
    await db.docInspectorConfigs.clear();
    act(() => {
      useUI.getState().setInspectorMode('expanded');
      useUI.getState().setInspectorSection('outline');
      useUI.getState().setVersionModalOpen(false);
      useUI.getState().setSaveVersionOpen(false);
    });
  });

  describe('rendering', () => {
    it('should render the inspector aside with the doc name, collapse button, and tab strip', () => {
      renderWithProviders(<DocInspector docName="My doc" docId="d1" />);
      const aside = screen.getByTestId('doc-inspector');
      expect(aside).toBeInTheDocument();
      expect(screen.getByTestId('doc-inspector-name')).toHaveTextContent(
        'My doc',
      );
      expect(screen.getByTestId('doc-inspector-collapse')).toHaveAttribute(
        'aria-label',
        'Collapse inspector',
      );
      for (const id of SECTIONS) {
        const tab = screen.getByTestId(`doc-inspector-tab-${id}`);
        expect(tab).toHaveTextContent(new RegExp(`^${id}$`, 'i'));
      }
    });

    it('should show an em-dash placeholder when docName is empty', () => {
      renderWithProviders(<DocInspector docName="" docId="d1" />);
      expect(screen.getByTestId('doc-inspector-name')).toHaveTextContent('—');
    });
  });

  describe('collapse button', () => {
    it('should switch inspectorMode to "icons" when clicked', async () => {
      renderWithProviders(<DocInspector docName="X" docId="d1" />);
      await userEvent.click(screen.getByTestId('doc-inspector-collapse'));
      expect(useUI.getState().inspectorMode).toBe('icons');
    });
  });

  describe('tab strip', () => {
    it.each(SECTIONS)(
      'should update inspectorSection and mark aria-current when the %s tab is clicked',
      async (id) => {
        act(() => {
          useUI.getState().setInspectorSection('outline');
        });
        renderWithProviders(<DocInspector docName="X" docId="d1" />);
        const tab = screen.getByTestId(`doc-inspector-tab-${id}`);
        await userEvent.click(tab);
        expect(useUI.getState().inspectorSection).toBe(id);
        expect(
          screen
            .getByTestId(`doc-inspector-tab-${id}`)
            .getAttribute('aria-current'),
        ).toBe('page');
      },
    );
  });

  describe('panes', () => {
    it('builds the outline from the document headings, skipping body prose', async () => {
      await seedDoc({
        body: serializedBlocks([
          { tag: 'h1', text: "The bell-keeper's last morning" },
          { text: 'Morning prose between the headings.' },
          { tag: 'h2', text: 'Mira walks' },
          { tag: 'h3', text: 'Counting' },
        ]),
      });
      act(() => {
        useUI.getState().setInspectorSection('outline');
      });
      renderWithProviders(<DocInspector docName="X" docId="d1" />);
      const pane = screen.getByTestId('doc-inspector-pane-outline');
      await waitFor(() => {
        expect(within(pane).getAllByTestId('outline-row')).toHaveLength(3);
      });
      const rows = within(pane).getAllByTestId('outline-row');
      expect(rows[0]).toHaveTextContent(/bell-keeper/i);
      expect(rows[0]).toHaveAttribute('data-level', '1');
      expect(rows[0]).toHaveTextContent('H1');
      expect(rows[1]).toHaveTextContent('Mira walks');
      expect(rows[1]).toHaveAttribute('data-level', '2');
      expect(rows[2]).toHaveTextContent('Counting');
      expect(rows[2]).toHaveAttribute('data-level', '3');
      expect(pane).not.toHaveTextContent('Morning prose');
      expect(pane).toHaveTextContent('3 SECTIONS');
      expect(within(pane).queryByTestId('outline-empty')).toBeNull();
    });

    it('shows an empty outline state when the document has no headings', async () => {
      await seedDoc({ body: serializedBody('Hello world') });
      act(() => {
        useUI.getState().setInspectorSection('outline');
      });
      renderWithProviders(<DocInspector docName="X" docId="d1" />);
      const empty = await screen.findByTestId('outline-empty');
      expect(empty).toHaveTextContent(/no headings yet/i);
      expect(screen.queryAllByTestId('outline-row')).toHaveLength(0);
      expect(screen.getByTestId('doc-inspector-pane-outline')).toHaveTextContent(
        '0 SECTIONS',
      );
    });

    it('should render live document info when section is "info"', async () => {
      await seedDoc({ body: serializedBody('Hello world') });
      act(() => {
        useUI.getState().setInspectorSection('info');
      });
      renderWithProviders(<DocInspector docName="X" docId="d1" />);
      const status = await screen.findByTestId('inspector-status');
      expect(status).toHaveValue('draft');
      const pane = screen.getByTestId('doc-inspector-info');
      expect(pane).toHaveTextContent('Words2');
      expect(pane).toHaveTextContent('Characters11');
    });

    it('writes a word limit to the document when edited', async () => {
      await seedDoc();
      act(() => {
        useUI.getState().setInspectorSection('info');
      });
      renderWithProviders(<DocInspector docName="X" docId="d1" />);
      const input = await screen.findByTestId('inspector-wordLimit');
      fireEvent.change(input, { target: { value: '500' } });
      await waitFor(async () => {
        expect((await db.docs.get('d1'))?.meta.wordLimit).toBe(500);
      });
    });

    it('writes a character limit to the document when edited', async () => {
      await seedDoc();
      act(() => {
        useUI.getState().setInspectorSection('info');
      });
      renderWithProviders(<DocInspector docName="X" docId="d1" />);
      const input = await screen.findByTestId('inspector-charLimit');
      fireEvent.change(input, { target: { value: '1200' } });
      await waitFor(async () => {
        expect((await db.docs.get('d1'))?.meta.charLimit).toBe(1200);
      });
    });

    it('changes the document status from the picker', async () => {
      await seedDoc();
      act(() => {
        useUI.getState().setInspectorSection('info');
      });
      renderWithProviders(<DocInspector docName="X" docId="d1" />);
      const status = await screen.findByTestId('inspector-status');
      fireEvent.change(status, { target: { value: 'complete' } });
      await waitFor(async () => {
        expect((await db.docs.get('d1'))?.meta.status).toBe('complete');
      });
    });

    it('hides a field disabled in settings', async () => {
      await db.docInspectorConfigs.put({
        spaceId: 'global',
        wordLimit: 'on',
        charLimit: 'on',
        status: 'on',
        dueDate: 'off',
        highlightOverLimit: 'on',
      });
      await seedDoc();
      act(() => {
        useUI.getState().setInspectorSection('info');
      });
      renderWithProviders(<DocInspector docName="X" docId="d1" />);
      await screen.findByTestId('inspector-status');
      // The effective-config live query resolves after the first render (which
      // falls back to defaults, all features on); wait for the disabled row to drop.
      await waitFor(() => {
        expect(screen.queryByTestId('inspector-due-date')).toBeNull();
        expect(screen.queryByTestId('inspector-row-dueDate')).toBeNull();
      });
    });

    it('always shows the word count but hides the limit suffix and input when wordLimit is off', async () => {
      await db.docInspectorConfigs.put({
        spaceId: 'global',
        wordLimit: 'off',
        charLimit: 'on',
        status: 'on',
        dueDate: 'on',
        highlightOverLimit: 'on',
      });
      await seedDoc();
      act(() => {
        useUI.getState().setInspectorSection('info');
      });
      renderWithProviders(<DocInspector docName="X" docId="d1" />);
      const row = await screen.findByTestId('inspector-row-words');
      expect(row).toHaveTextContent(/Words\s*2$/);
      expect(row).not.toHaveTextContent('/');
      // The effective-config live query resolves after the first render (which
      // falls back to defaults, all features on); wait for the disabled limit to drop.
      await waitFor(() => {
        expect(screen.queryByTestId('inspector-row-wordLimit')).toBeNull();
      });
      expect(screen.queryByTestId('inspector-wordLimit')).toBeNull();
    });

    it('always shows the character count but hides the limit suffix and input when charLimit is off', async () => {
      await db.docInspectorConfigs.put({
        spaceId: 'global',
        wordLimit: 'on',
        charLimit: 'off',
        status: 'on',
        dueDate: 'on',
        highlightOverLimit: 'on',
      });
      await seedDoc();
      act(() => {
        useUI.getState().setInspectorSection('info');
      });
      renderWithProviders(<DocInspector docName="X" docId="d1" />);
      const row = await screen.findByTestId('inspector-row-characters');
      expect(row).toHaveTextContent(/Characters\s*11$/);
      expect(row).not.toHaveTextContent('/');
      // The effective-config live query resolves after the first render (which
      // falls back to defaults, all features on); wait for the disabled limit to drop.
      await waitFor(() => {
        expect(screen.queryByTestId('inspector-row-charLimit')).toBeNull();
      });
      expect(screen.queryByTestId('inspector-charLimit')).toBeNull();
    });

    it('shows count plus limit when the feature is enabled and a limit is set', async () => {
      await seedDoc({ meta: { wordCount: 2, wordLimit: 500, charLimit: 200 } });
      act(() => {
        useUI.getState().setInspectorSection('info');
      });
      renderWithProviders(<DocInspector docName="X" docId="d1" />);
      const words = await screen.findByTestId('inspector-row-words');
      expect(words).toHaveTextContent('2 / 500');
      const chars = screen.getByTestId('inspector-row-characters');
      expect(chars).toHaveTextContent('11 / 200');
      expect(screen.getByTestId('inspector-wordLimit')).toHaveValue(500);
      expect(screen.getByTestId('inspector-charLimit')).toHaveValue(200);
    });

    it('hides the limit suffix and input when the toggle is off even if the doc has a value', async () => {
      await db.docInspectorConfigs.put({
        spaceId: 'global',
        wordLimit: 'off',
        charLimit: 'on',
        status: 'on',
        dueDate: 'on',
        highlightOverLimit: 'on',
      });
      await seedDoc({ meta: { wordCount: 2, wordLimit: 250 } });
      act(() => {
        useUI.getState().setInspectorSection('info');
      });
      renderWithProviders(<DocInspector docName="X" docId="d1" />);
      const row = await screen.findByTestId('inspector-row-words');
      expect(row).toHaveTextContent(/Words\s*2$/);
      expect(row).not.toHaveTextContent('/');
      // The effective-config live query resolves after the first render (which
      // falls back to defaults, all features on); wait for the disabled limit to drop.
      await waitFor(() => {
        expect(screen.queryByTestId('inspector-wordLimit')).toBeNull();
      });
    });

    it('always shows Updated, Section and the live counts regardless of toggles', async () => {
      await db.docInspectorConfigs.put({
        spaceId: 'global',
        wordLimit: 'off',
        charLimit: 'off',
        status: 'off',
        dueDate: 'off',
        highlightOverLimit: 'off',
      });
      await seedDoc();
      act(() => {
        useUI.getState().setInspectorSection('info');
      });
      renderWithProviders(<DocInspector docName="X" docId="d1" />);
      expect(await screen.findByTestId('inspector-row-words')).toHaveTextContent(
        /Words\s*2$/,
      );
      expect(screen.getByTestId('inspector-row-characters')).toHaveTextContent(
        /Characters\s*11$/,
      );
      expect(screen.getByTestId('inspector-row-updated')).toBeInTheDocument();
      expect(screen.getByTestId('inspector-row-section')).toBeInTheDocument();
      // The effective-config live query resolves after the first render (which
      // falls back to defaults, all features on); wait for the disabled rows to drop.
      await waitFor(() => {
        expect(screen.queryByTestId('inspector-row-wordLimit')).toBeNull();
        expect(screen.queryByTestId('inspector-row-charLimit')).toBeNull();
        expect(screen.queryByTestId('inspector-row-status')).toBeNull();
        expect(screen.queryByTestId('inspector-row-dueDate')).toBeNull();
      });
    });

    it('renders a "no due date" placeholder in read-only mode when the doc has none', async () => {
      await seedDoc({ meta: { wordCount: 2 } });
      act(() => {
        useUI.getState().setInspectorSection('info');
      });
      renderWithProviders(<DocInspector docName="X" docId="d1" readOnly />);
      const row = await screen.findByTestId('inspector-row-dueDate');
      expect(row).toHaveTextContent(/no due date/i);
    });

    it('renders read-only meta rows (no editable controls) when readOnly is set', async () => {
      await seedDoc({
        meta: {
          wordCount: 2,
          status: 'in-review',
          wordLimit: 100,
          dueDate: new Date(2026, 5, 1).getTime(),
        },
      });
      act(() => {
        useUI.getState().setInspectorSection('info');
      });
      renderWithProviders(<DocInspector docName="X" docId="d1" readOnly />);
      const status = await screen.findByTestId('inspector-row-status');
      expect(status).toHaveTextContent(/in review/i);
      expect(screen.queryByTestId('inspector-status')).toBeNull();
      expect(screen.queryByTestId('inspector-wordLimit')).toBeNull();
      expect(screen.queryByTestId('inspector-due-date')).toBeNull();
    });

    it('hides a disabled field even when the doc already has a value', async () => {
      await db.docInspectorConfigs.put({
        spaceId: 'global',
        wordLimit: 'on',
        charLimit: 'on',
        status: 'on',
        dueDate: 'off',
        highlightOverLimit: 'on',
      });
      await seedDoc({ meta: { wordCount: 2, dueDate: 1_700_000_000_000 } });
      act(() => {
        useUI.getState().setInspectorSection('info');
      });
      renderWithProviders(<DocInspector docName="X" docId="d1" />);
      await screen.findByTestId('inspector-row-section');
      expect(screen.queryByTestId('inspector-due-date')).toBeNull();
      expect(screen.queryByTestId('inspector-row-dueDate')).toBeNull();
    });

    it('should show an empty state in the HistoryPane when the doc has no revisions', () => {
      act(() => {
        useUI.getState().setInspectorSection('history');
      });
      renderWithProviders(<DocInspector docName="X" docId="d1" />);
      const pane = screen.getByTestId('doc-inspector-pane-history');
      expect(pane).toHaveTextContent(/no versions yet/i);
    });

    it('should list live revisions in the HistoryPane', async () => {
      await db.revisions.bulkPut([
        makeRevision({ id: 'rev-old', label: 'first draft', createdAt: 1 }),
        makeRevision({ id: 'rev-new', kind: 'baseline', createdAt: 2 }),
      ]);
      act(() => {
        useUI.getState().setInspectorSection('history');
      });
      renderWithProviders(<DocInspector docName="X" docId="d1" />);
      await waitFor(() => {
        expect(screen.getByTestId('revision-row-rev-old')).toBeInTheDocument();
      });
      const pane = screen.getByTestId('doc-inspector-pane-history');
      expect(pane).toHaveTextContent(/first draft/i);
      expect(pane).toHaveTextContent(/baseline/i);
    });

    it('restores a revision via the confirm dialog (no native popup)', async () => {
      await db.docs.put({
        id: 'd1',
        spaceId: 's1',
        sectionId: 'sec1',
        name: 'Doc',
        body: serializedBody('current body'),
        meta: { wordCount: 2 },
        updatedAt: 1,
      });
      await db.revisions.put(
        makeRevision({ id: 'rev-old', body: serializedBody('older body'), createdAt: 1 }),
      );
      act(() => {
        useUI.getState().setInspectorSection('history');
      });
      renderWithProviders(<DocInspector docName="X" docId="d1" />);

      const row = await screen.findByTestId('revision-row-rev-old');
      await userEvent.click(within(row).getByLabelText(/^restore$/i));
      await userEvent.click(await screen.findByTestId('confirm-dialog-confirm'));

      await waitFor(async () => {
        const updated = await db.docs.get('d1');
        expect(updated?.body).toBe(serializedBody('older body'));
      });
    });

    it('writes the due date to the document when the date field is changed', async () => {
      await seedDoc();
      act(() => {
        useUI.getState().setInspectorSection('info');
      });
      renderWithProviders(<DocInspector docName="X" docId="d1" />);
      const due = await screen.findByTestId('inspector-due-date');
      fireEvent.change(due, { target: { value: '2026-07-01' } });
      await waitFor(async () => {
        expect((await db.docs.get('d1'))?.meta.dueDate).toBe(
          new Date(2026, 6, 1).getTime(),
        );
      });
    });

    it('clears the due date when the date field is emptied', async () => {
      await seedDoc({
        meta: { wordCount: 2, dueDate: new Date(2026, 5, 1).getTime() },
      });
      act(() => {
        useUI.getState().setInspectorSection('info');
      });
      renderWithProviders(<DocInspector docName="X" docId="d1" />);
      const due = await screen.findByTestId('inspector-due-date');
      fireEvent.change(due, { target: { value: '' } });
      await waitFor(async () => {
        expect((await db.docs.get('d1'))?.meta.dueDate).toBeUndefined();
      });
    });

    it('toggles a revision\'s pinned state when the pin icon is clicked', async () => {
      await db.revisions.put(
        makeRevision({ id: 'rev-pin', kind: 'manual', pinned: false }),
      );
      act(() => {
        useUI.getState().setInspectorSection('history');
      });
      renderWithProviders(<DocInspector docName="X" docId="d1" />);
      const row = await screen.findByTestId('revision-row-rev-pin');
      await userEvent.click(within(row).getByLabelText(/pin version/i));
      await waitFor(async () => {
        expect((await db.revisions.get('rev-pin'))?.pinned).toBe(true);
      });
      await userEvent.click(within(row).getByLabelText(/unpin version/i));
      await waitFor(async () => {
        expect((await db.revisions.get('rev-pin'))?.pinned).toBe(false);
      });
    });

    it('logs an error when a restore attempt rejects', async () => {
      await db.docs.put({
        id: 'd1',
        spaceId: 's1',
        sectionId: 'sec1',
        name: 'Doc',
        body: serializedBody('current body'),
        meta: { wordCount: 2 },
        updatedAt: 1,
      });
      await db.revisions.put(
        makeRevision({ id: 'rev-x', body: serializedBody('older'), createdAt: 1 }),
      );
      const txSpy = vi
        .spyOn(db, 'transaction')
        .mockRejectedValueOnce(new Error('boom') as never);
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      act(() => {
        useUI.getState().setInspectorSection('history');
      });
      renderWithProviders(<DocInspector docName="X" docId="d1" />);
      const row = await screen.findByTestId('revision-row-rev-x');
      await userEvent.click(within(row).getByLabelText(/^restore$/i));
      await userEvent.click(await screen.findByTestId('confirm-dialog-confirm'));
      await waitFor(() => {
        expect(errSpy).toHaveBeenCalledWith(
          'Failed to restore revision',
          expect.any(Error),
        );
      });
      txSpy.mockRestore();
      errSpy.mockRestore();
    });

    it('opens the save-version dialog from the history pane', async () => {
      act(() => {
        useUI.getState().setInspectorSection('history');
      });
      renderWithProviders(<DocInspector docName="X" docId="d1" />);
      await userEvent.click(screen.getByTestId('history-save-version'));
      expect(useUI.getState().saveVersionOpen).toBe(true);
    });

    it('should open the version modal from the history "full" link', async () => {
      act(() => {
        useUI.getState().setInspectorSection('history');
      });
      renderWithProviders(<DocInspector docName="X" docId="d1" />);
      await userEvent.click(screen.getByTestId('open-version-modal'));
      expect(useUI.getState().versionModalOpen).toBe(true);
    });

    it('should hide the history tab and fall back to outline when hideHistory is set', () => {
      act(() => {
        useUI.getState().setInspectorSection('history');
      });
      renderWithProviders(<DocInspector docName="X" docId="d1" hideHistory />);
      expect(
        screen.queryByTestId('doc-inspector-tab-history'),
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('doc-inspector-pane-outline')).toBeInTheDocument();
      expect(
        screen.queryByTestId('doc-inspector-pane-history'),
      ).not.toBeInTheDocument();
      expect(useUI.getState().inspectorSection).toBe('history');
    });

    it('should keep the history tab when hideHistory is not set', () => {
      act(() => {
        useUI.getState().setInspectorSection('history');
      });
      renderWithProviders(<DocInspector docName="X" docId="d1" />);
      expect(
        screen.getByTestId('doc-inspector-tab-history'),
      ).toBeInTheDocument();
    });

    it('should render the ActionsPane when section is "actions"', () => {
      act(() => {
        useUI.getState().setInspectorSection('actions');
      });
      renderWithProviders(<DocInspector docName="X" docId="d1" />);
      const pane = screen.getByTestId('doc-inspector-pane-actions');
      expect(pane).toHaveTextContent(/rename/i);
      expect(pane).toHaveTextContent(/trash/i);
    });

    it('should not show version actions in the actions pane', () => {
      act(() => {
        useUI.getState().setInspectorSection('actions');
      });
      renderWithProviders(<DocInspector docName="X" docId="d1" />);
      expect(screen.queryByTestId('action-save-version')).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('action-version-history'),
      ).not.toBeInTheDocument();
    });
  });

  describe('snapshot', () => {
    it('should match the snapshot across all variants', () => {
      const { container: outline } = renderWithProviders(
        <DocInspector docName="My doc" docId="d1" />,
      );
      expect(outline).toMatchSnapshot('section=outline');

      act(() => {
        useUI.getState().setInspectorSection('info');
      });
      const { container: info } = renderWithProviders(
        <DocInspector docName="My doc" docId="d1" />,
      );
      expect(info).toMatchSnapshot('section=info');

      const { container: empty } = renderWithProviders(
        <DocInspector docName="" docId="d1" />,
      );
      expect(empty).toMatchSnapshot('docName=empty');
    });
  });
});
