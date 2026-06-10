import { act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { useUI } from '@/store/ui';
import { db } from '@/db/db';
import type { Doc, Revision } from '@/db/schema';
import { sampleDoc, sampleSpace, sampleSection, serializedBody } from '@/test/fixtures';
import { VersionHistoryModal } from './VersionHistoryModal';

const doc: Doc = {
  ...sampleDoc,
  body: serializedBody('the quick brown fox'),
  meta: { wordCount: 4 },
};

const makeRevision = (overrides: Partial<Revision>): Revision => ({
  id: overrides.id ?? 'r',
  docId: overrides.docId ?? doc.id,
  body: overrides.body ?? serializedBody('body'),
  text: overrides.text ?? 'body',
  wordCount: overrides.wordCount ?? 1,
  kind: overrides.kind ?? 'manual',
  createdAt: overrides.createdAt ?? Date.now(),
  pinned: overrides.pinned,
  label: overrides.label,
});

const openModal = (): void => {
  act(() => {
    useUI.getState().setVersionModalOpen(true);
    useUI.getState().setCompareRevisionIds({ base: null, compare: null });
    useUI.getState().setDiffMode('side-by-side');
  });
};

describe('VersionHistoryModal', () => {
  beforeEach(async () => {
    await db.spaces.put(sampleSpace);
    await db.sections.put(sampleSection);
    await db.docs.put(doc);
  });

  it('shows an empty state when there are no revisions', async () => {
    openModal();
    renderWithProviders(<VersionHistoryModal doc={doc} />);
    await waitFor(() => {
      expect(screen.getByTestId('version-modal-list')).toHaveTextContent(
        /no versions yet/i,
      );
    });
  });

  it('lists revisions and diffs the selected one against current text', async () => {
    await db.revisions.put(
      makeRevision({ id: 'rev1', text: 'the slow brown fox', createdAt: 10 }),
    );
    openModal();
    renderWithProviders(<VersionHistoryModal doc={doc} />);

    await waitFor(() => {
      expect(screen.getByTestId('version-modal-item-rev1')).toBeInTheDocument();
    });
    // Default selection is the newest revision; the diff view should render.
    await waitFor(() => {
      expect(screen.getByTestId('diff-view')).toBeInTheDocument();
    });
    // "slow" was removed, "quick" added between the revision and current text.
    expect(screen.getByTestId('diff-view')).toHaveTextContent(/quick/);
  });

  it('toggles between inline and side-by-side diff layouts', async () => {
    await db.revisions.put(
      makeRevision({ id: 'rev1', text: 'the slow brown fox', createdAt: 10 }),
    );
    openModal();
    renderWithProviders(<VersionHistoryModal doc={doc} />);

    await waitFor(() => {
      expect(screen.getByTestId('diff-mode-toggle')).toBeInTheDocument();
    });
    expect(useUI.getState().diffMode).toBe('side-by-side');
    await userEvent.click(screen.getByTestId('diff-mode-toggle'));
    expect(useUI.getState().diffMode).toBe('inline');
  });

  it('pins a revision from the list', async () => {
    await db.revisions.put(makeRevision({ id: 'rev1', createdAt: 10 }));
    openModal();
    renderWithProviders(<VersionHistoryModal doc={doc} />);

    const pinBtn = await screen.findByLabelText('Pin');
    await userEvent.click(pinBtn);
    await waitFor(async () => {
      const stored = await db.revisions.get('rev1');
      expect(stored?.pinned).toBe(true);
    });
  });

  it('restores a version through the confirm dialog (no native popup)', async () => {
    await db.revisions.put(
      makeRevision({ id: 'rev1', text: 'old text', body: serializedBody('old text'), createdAt: 10 }),
    );
    openModal();
    renderWithProviders(<VersionHistoryModal doc={doc} />);

    await userEvent.click(await screen.findByTestId('modal-restore'));
    // A DS confirm dialog appears instead of window.confirm.
    await userEvent.click(await screen.findByTestId('confirm-dialog-confirm'));

    await waitFor(async () => {
      const updated = await db.docs.get(doc.id);
      expect(updated?.body).toBe(serializedBody('old text'));
    });
    // The pre-restore safety snapshot was captured.
    const rows = await db.revisions.where('docId').equals(doc.id).toArray();
    expect(rows.some((r) => r.label === 'pre-restore')).toBe(true);
  });

  it('does not restore when the confirm dialog is cancelled', async () => {
    await db.revisions.put(
      makeRevision({ id: 'rev1', text: 'old text', body: serializedBody('old text'), createdAt: 10 }),
    );
    openModal();
    renderWithProviders(<VersionHistoryModal doc={doc} />);

    await userEvent.click(await screen.findByTestId('modal-restore'));
    await userEvent.click(await screen.findByTestId('confirm-dialog-cancel'));

    const updated = await db.docs.get(doc.id);
    expect(updated?.body).toBe(serializedBody('the quick brown fox'));
  });
});
