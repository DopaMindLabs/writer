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
  body: overrides.body ?? 'body',
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
    body: 'Hello world',
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
    it('should render the OutlinePane when section is "outline"', () => {
      act(() => {
        useUI.getState().setInspectorSection('outline');
      });
      renderWithProviders(<DocInspector docName="X" docId="d1" />);
      const pane = screen.getByTestId('doc-inspector-pane-outline');
      expect(pane).toHaveTextContent(/Mira walks/);
      expect(pane).toHaveTextContent(/bell-keeper/i);
    });

    it('should render live document info when section is "info"', async () => {
      await seedDoc({ body: 'Hello world' });
      act(() => {
        useUI.getState().setInspectorSection('info');
      });
      renderWithProviders(<DocInspector docName="X" docId="d1" />);
      const status = await screen.findByTestId('inspector-status');
      expect(status).toHaveValue('draft');
      const pane = screen.getByTestId('doc-inspector-info');
      // "Hello world" → 2 words, 11 characters (label and value concatenate)
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

    it('hides a field disabled in settings unless the doc has a value', async () => {
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
      expect(screen.queryByTestId('inspector-due-date')).toBeNull();
    });

    it('shows a disabled field when the doc already has a value', async () => {
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
      expect(await screen.findByTestId('inspector-due-date')).toBeInTheDocument();
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
        body: 'current body',
        meta: { wordCount: 2 },
        updatedAt: 1,
      });
      await db.revisions.put(
        makeRevision({ id: 'rev-old', body: 'older body', createdAt: 1 }),
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
        expect(updated?.body).toBe('older body');
      });
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
      // The persisted "history" section is coerced to "outline" locally without
      // mutating the store, so the write surface still restores it.
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
