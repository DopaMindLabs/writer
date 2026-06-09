import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { render, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import { FIXED_TIME } from '@/test/fixtures';
import type { Doc } from '@/db/schema';

// Captures the onChange prop the stub editor was last rendered with, so tests
// can replay a pending autosave flush from a previous render (the unmount
// flush in AutosavePlugin calls the onChange of the render it mounted under).
const editorMocks = vi.hoisted(() => ({
  capturedOnChange: undefined as ((s: string) => void) | undefined,
}));

vi.mock('@/editor/EditorFacade', () => ({
  Editor: (props: {
    initialValue: string;
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
        onClick={() => props.onChange?.('new-serialized-body')}
      >
        {props.initialValue || '(empty)'}
      </button>
    );
  },
}));

const { WriteSurface } = await import('./WriteSurface');

const doc: Doc = {
  id: 'd1',
  spaceId: 's1',
  sectionId: 'sec1',
  name: 'Sample',
  body: 'hello world',
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
      expect(fresh?.body).toBe('new-serialized-body');
    });
  });

  it('caches the recomputed word count without clobbering other meta', async () => {
    const withStatus: Doc = { ...doc, meta: { wordCount: 2, status: 'draft' } };
    await db.docs.put(withStatus);
    const { getByTestId } = render(<WriteSurface doc={withStatus} mode="write" />);
    await userEvent.click(getByTestId('editor-stub'));
    await waitFor(async () => {
      const fresh = await db.docs.get(doc.id);
      // 'new-serialized-body' is a single whitespace-delimited token.
      expect(fresh?.meta.wordCount).toBe(1);
      // Sibling meta fields survive the update.
      expect(fresh?.meta.status).toBe('draft');
    });
  });

  it('does not revert Inspector meta written after render while a save is pending', async () => {
    // The `doc` prop is a lagging live-query value. Render with a stale prop,
    // then simulate the Inspector writing new meta straight to the DB before the
    // prop catches up. Autosave must not restore the prop's old meta.
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
      // Word count is refreshed by autosave...
      expect(fresh?.meta.wordCount).toBe(1);
      // ...but the concurrent Inspector edits are preserved, not clobbered.
      expect(fresh?.meta.status).toBe('complete');
      expect(fresh?.meta.wordLimit).toBe(500);
    });
  });

  it('saves a pending edit to the doc it was typed in, not the doc shown after a switch', async () => {
    // Typing then switching documents inside the autosave debounce window makes
    // AutosavePlugin flush on unmount using the onChange it mounted under. That
    // flush must write to the document the edit came from — never to the
    // newly-opened one.
    const docB: Doc = {
      ...doc,
      id: 'd2',
      name: 'Other',
      body: 'other body',
      meta: { wordCount: 2 },
    };
    await db.docs.put(doc);
    await db.docs.put(docB);

    const { rerender } = render(<WriteSurface doc={doc} mode="write" />);
    const flushForDocA = editorMocks.capturedOnChange;
    rerender(<WriteSurface doc={docB} mode="write" />);
    flushForDocA?.('pending-edit-from-doc-a');

    await waitFor(async () => {
      const freshA = await db.docs.get(doc.id);
      const freshB = await db.docs.get(docB.id);
      expect(freshA?.body).toBe('pending-edit-from-doc-a');
      expect(freshB?.body).toBe('other body');
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
