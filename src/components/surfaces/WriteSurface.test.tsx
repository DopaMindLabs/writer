import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { render, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import { FIXED_TIME, serializedBody } from '@/test/fixtures';
import type { Doc } from '@/db/schema';

const editorMocks = vi.hoisted(() => ({
  capturedOnChange: undefined as ((s: string) => void) | undefined,
}));

vi.mock('@/editor/EditorFacade', () => ({
  Editor: (props: {
    initialSerialized: string;
    mode: string;
    placeholder?: string;
    locked?: boolean;
    onChange?: (s: string) => void;
  }) => {
    editorMocks.capturedOnChange = props.onChange;
    return (
      <button
      type="button"
      data-testid="editor-stub"
      data-mode={props.mode}
      data-locked={props.locked ? 'true' : undefined}
      data-placeholder={props.placeholder}
        onClick={() => props.onChange?.(NEW_BODY)}
      >
        {props.initialSerialized || '(empty)'}
      </button>
    );
  },
}));

vi.mock('@/editor/collab/useDocSyncSession', () => ({
  useDocSyncSession: (docId: string) => ({
    key: 'test-session',
    docId,
    epoch: 0,
    handle: {} as unknown,
    hasStoredState: false,
    close: () => undefined,
  }),
}));

const { WriteSurface } = await import('./WriteSurface');

const NEW_BODY = serializedBody('rewritten');

const doc: Doc = {
  id: 'd1',
  spaceId: 's1',
  sectionId: 'sec1',
  name: 'Sample',
  body: serializedBody('hello world'),
  meta: { wordCount: 2 },
  updatedAt: FIXED_TIME,
};

describe('WriteSurface', () => {
  it('renders editor stub with doc body and mode', () => {
    const { container } = render(<WriteSurface doc={doc} mode="write" />);
    expect(container).toMatchSnapshot();
  });

  it('persists the serialized editor value to Dexie when the editor fires onChange', async () => {
    await db.docs.put(doc);
    const { getByTestId } = render(<WriteSurface doc={doc} mode="write" />);
    await userEvent.click(getByTestId('editor-stub'));
    await waitFor(async () => {
      const fresh = await db.docs.get(doc.id);
      expect(fresh?.body).toBe(NEW_BODY);
    });
  });

  it('caches the recomputed word count without clobbering other meta', async () => {
    const withStatus: Doc = { ...doc, meta: { wordCount: 2, status: 'draft' } };
    await db.docs.put(withStatus);
    const { getByTestId } = render(<WriteSurface doc={withStatus} mode="write" />);
    await userEvent.click(getByTestId('editor-stub'));
    await waitFor(async () => {
      const fresh = await db.docs.get(doc.id);
      expect(fresh?.meta.wordCount).toBe(1);
      expect(fresh?.meta.status).toBe('draft');
    });
  });

  it('does not revert Inspector meta written after render while a save is pending', async () => {
    const stale: Doc = { ...doc, meta: { wordCount: 2, status: 'draft' } };
    await db.docs.put(stale);
    const { getByTestId } = render(<WriteSurface doc={stale} mode="write" />);

    await db.docs.update(doc.id, {
      'meta.status': 'complete',
      'meta.wordLimit': 500,
    });

    await userEvent.click(getByTestId('editor-stub'));

    await waitFor(async () => {
      const fresh = await db.docs.get(doc.id);
      expect(fresh?.meta.wordCount).toBe(1);
      expect(fresh?.meta.status).toBe('complete');
      expect(fresh?.meta.wordLimit).toBe(500);
    });
  });

  it('saves a pending edit to the doc it was typed in, not the doc shown after a switch', async () => {
    const docB: Doc = {
      ...doc,
      id: 'd2',
      name: 'Other',
      body: serializedBody('other body'),
      meta: { wordCount: 2 },
    };
    await db.docs.put(doc);
    await db.docs.put(docB);

    const { rerender } = render(<WriteSurface doc={doc} mode="write" />);
    const flushForDocA = editorMocks.capturedOnChange;
    rerender(<WriteSurface doc={docB} mode="write" />);
    flushForDocA?.(serializedBody('pending-edit-from-doc-a'));

    await waitFor(async () => {
      const freshA = await db.docs.get(doc.id);
      const freshB = await db.docs.get(docB.id);
      expect(freshA?.body).toBe(serializedBody('pending-edit-from-doc-a'));
      expect(freshB?.body).toBe(serializedBody('other body'));
    });
  });

  it('shows no lock banner and leaves the editor editable when unlocked', () => {
    const { queryByTestId, getByTestId } = render(
      <WriteSurface doc={doc} mode="write" />,
    );
    expect(queryByTestId('doc-lock-banner')).toBeNull();
    expect(getByTestId('editor-stub')).not.toHaveAttribute('data-locked');
  });

  it('shows the lock banner and locks the editor when locked', () => {
    const { getByTestId } = render(
      <WriteSurface doc={doc} mode="write" locked />,
    );
    expect(getByTestId('doc-lock-banner')).toBeInTheDocument();
    expect(getByTestId('editor-stub')).toHaveAttribute('data-locked', 'true');
  });

  it('unlocks by resetting the status to draft from the banner action', async () => {
    const locked: Doc = { ...doc, meta: { ...doc.meta, status: 'complete' } };
    await db.docs.put(locked);
    const { getByRole } = render(
      <WriteSurface doc={locked} mode="write" locked />,
    );
    await userEvent.click(getByRole('button', { name: /unlock to edit/i }));
    await waitFor(async () => {
      const fresh = await db.docs.get(doc.id);
      expect(fresh?.meta.status).toBe('draft');
    });
  });
});
