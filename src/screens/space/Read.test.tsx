import { vi } from 'vitest';
import { act } from '@testing-library/react';
import { renderAtRoute } from '@/test/test-utils';
import { sampleDoc, seedBasicSpace } from '@/test/fixtures';
import { db } from '@/db/db';
import { useUI } from '@/store/ui';

vi.mock('@/editor/EditorFacade', () => ({
  Editor: (p: { initialSerialized: string; mode: string }) => (
    <div data-testid="editor-stub" data-mode={p.mode}>
      {p.initialSerialized || '(empty)'}
    </div>
  ),
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

const { ReadScreen } = await import('./Read');

describe('ReadScreen', () => {
  beforeEach(async () => {
    await seedBasicSpace();
    act(() => {
      useUI.getState().setInspectorMode('none');
      useUI.getState().closeCitationsDrawer();
    });
  });

  it('renders editor in read mode', async () => {
    const { findByTestId } = renderAtRoute(<ReadScreen />, {
      path: '/s/:spaceId/d/:docId/read',
      initialEntries: ['/s/s1/d/d1/read'],
    });
    const editor = await findByTestId('editor-stub');
    expect(editor.getAttribute('data-mode')).toBe('read');
  });

  it('redirects when params are missing', () => {
    const { queryByTestId } = renderAtRoute(<ReadScreen />, {
      path: '/orphan',
      initialEntries: ['/orphan'],
    });
    expect(queryByTestId('catch-all')).toBeInTheDocument();
  });

  it('shows the inspector icons rail when inspectorMode is "icons"', async () => {
    act(() => {
      useUI.getState().setInspectorMode('icons');
    });
    const { findByTestId } = renderAtRoute(<ReadScreen />, {
      path: '/s/:spaceId/d/:docId/read',
      initialEntries: ['/s/s1/d/d1/read'],
    });
    expect(await findByTestId('doc-inspector-icons')).toBeInTheDocument();
  });

  it('shows the expanded inspector panel when inspectorMode is "expanded"', async () => {
    act(() => {
      useUI.getState().setInspectorMode('expanded');
    });
    const { findByTestId } = renderAtRoute(<ReadScreen />, {
      path: '/s/:spaceId/d/:docId/read',
      initialEntries: ['/s/s1/d/d1/read'],
    });
    expect(await findByTestId('doc-inspector')).toBeInTheDocument();
  });

  it('locks the editor when the document status is a locked stage', async () => {
    await db.docs.put({
      ...sampleDoc,
      meta: { ...sampleDoc.meta, status: 'complete' },
    });
    const { findByTestId } = renderAtRoute(<ReadScreen />, {
      path: '/s/:spaceId/d/:docId/read',
      initialEntries: ['/s/s1/d/d1/read'],
    });
    expect(await findByTestId('doc-lock-banner')).toBeInTheDocument();
  });

  it('hides the inspector when the citations drawer is open', async () => {
    act(() => {
      useUI.getState().setInspectorMode('icons');
      useUI.getState().openCitationsDrawer();
    });
    const { queryByTestId, findByTestId } = renderAtRoute(<ReadScreen />, {
      path: '/s/:spaceId/d/:docId/read',
      initialEntries: ['/s/s1/d/d1/read'],
    });
    await findByTestId('editor-stub');
    expect(queryByTestId('doc-inspector-icons')).not.toBeInTheDocument();
  });
});
