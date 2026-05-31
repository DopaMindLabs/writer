import { act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { useUI } from '@/store/ui';
import { db } from '@/db/db';
import type { Doc } from '@/db/schema';
import { sampleDoc, sampleSpace, sampleSection } from '@/test/fixtures';
import { SaveVersionDialog } from './SaveVersionDialog';

const doc: Doc = { ...sampleDoc, body: 'the quick brown fox' };

const openDialog = (): void => {
  act(() => { useUI.getState().setSaveVersionOpen(true); });
};

describe('SaveVersionDialog', () => {
  beforeEach(async () => {
    await db.spaces.put(sampleSpace);
    await db.sections.put(sampleSection);
    await db.docs.put(doc);
    act(() => { useUI.getState().setSaveVersionOpen(false); });
  });

  it('does not render its form when closed', () => {
    renderWithProviders(<SaveVersionDialog docId={doc.id} />);
    expect(screen.queryByTestId('save-version-label')).not.toBeInTheDocument();
  });

  it('writes a labelled manual revision on submit and closes', async () => {
    openDialog();
    renderWithProviders(<SaveVersionDialog docId={doc.id} />);

    const input = await screen.findByTestId('save-version-label');
    await userEvent.type(input, 'first milestone');
    await userEvent.click(screen.getByTestId('save-version-submit'));

    await waitFor(async () => {
      const rows = await db.revisions.where('docId').equals(doc.id).toArray();
      const manual = rows.find((r) => r.kind === 'manual');
      expect(manual?.label).toBe('first milestone');
    });
    expect(useUI.getState().saveVersionOpen).toBe(false);
  });

  it('saves an unlabelled version when no name is given', async () => {
    openDialog();
    renderWithProviders(<SaveVersionDialog docId={doc.id} />);

    await screen.findByTestId('save-version-label');
    await userEvent.click(screen.getByTestId('save-version-submit'));

    await waitFor(async () => {
      const rows = await db.revisions.where('docId').equals(doc.id).toArray();
      expect(rows.some((r) => r.kind === 'manual' && !r.label)).toBe(true);
    });
  });

  it('closes without saving when cancel is clicked', async () => {
    openDialog();
    renderWithProviders(<SaveVersionDialog docId={doc.id} />);

    await screen.findByTestId('save-version-label');
    await userEvent.click(screen.getByTestId('save-version-cancel'));

    expect(useUI.getState().saveVersionOpen).toBe(false);
    const rows = await db.revisions.where('docId').equals(doc.id).toArray();
    expect(rows.some((r) => r.kind === 'manual')).toBe(false);
  });
});
