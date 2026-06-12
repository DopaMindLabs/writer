import { vi } from 'vitest';
import { act } from '@testing-library/react';
import { renderAtRoute } from '@/test/test-utils';
import { seedBasicSpace } from '@/test/fixtures';
import { useUI } from '@/store/ui';

vi.mock('@/editor/EditorFacade', () => ({
  Editor: (p: { initialSerialized: string; mode: string; placeholder?: string }) => (
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

const { WriteScreen } = await import('./Write');

describe('WriteScreen', () => {
  beforeEach(seedBasicSpace);

  it('renders editor for the active doc', async () => {
    const { findByTestId } = renderAtRoute(<WriteScreen />, {
      path: '/s/:spaceId/d/:docId',
      initialEntries: ['/s/s1/d/d1'],
    });
    expect(await findByTestId('editor-stub')).toBeInTheDocument();
  });

  it('redirects home when spaceId missing', () => {
    const { queryByTestId } = renderAtRoute(<WriteScreen />, {
      path: '/orphan',
      initialEntries: ['/orphan'],
    });
    expect(queryByTestId('catch-all')).toBeInTheDocument();
  });

  it('renders empty state when no doc selected and no docs exist', async () => {
    const { findByText } = renderAtRoute(<WriteScreen />, {
      path: '/s/:spaceId',
      initialEntries: ['/s/empty'],
    });
    expect(await findByText('Empty space')).toBeInTheDocument();
  });

  it('shows a loading indicator instead of flashing the empty state while a space resolves', async () => {
    const { queryByText, queryByTestId, findByText } = renderAtRoute(
      <WriteScreen />,
      { path: '/s/:spaceId', initialEntries: ['/s/empty'] },
    );
    expect(queryByTestId('write-loading')).toBeInTheDocument();
    expect(queryByText('Empty space')).not.toBeInTheDocument();
    expect(await findByText('Empty space')).toBeInTheDocument();
  });

  it('renders focus rail when focus=1', async () => {
    const { findByTestId } = renderAtRoute(<WriteScreen />, {
      path: '/s/:spaceId/d/:docId',
      initialEntries: ['/s/s1/d/d1?focus=1'],
    });
    const editor = await findByTestId('editor-stub');
    expect(editor.getAttribute('data-mode')).toBe('focus');
  });

  it('redirects to the first doc when none is selected but docs exist in the space', async () => {
    const { findByTestId } = renderAtRoute(<WriteScreen />, {
      path: '/s/:spaceId',
      initialEntries: ['/s/s1'],
    });
    expect(await findByTestId('catch-all')).toBeInTheDocument();
  });

  it('shows the inspector icons rail when inspectorMode is "icons" and not in focus mode', async () => {
    act(() => {
      useUI.getState().setInspectorMode('icons');
      useUI.getState().closeCitationsDrawer();
    });
    const { findByTestId } = renderAtRoute(<WriteScreen />, {
      path: '/s/:spaceId/d/:docId',
      initialEntries: ['/s/s1/d/d1'],
    });
    expect(await findByTestId('doc-inspector-icons')).toBeInTheDocument();
  });

  it('shows the expanded inspector panel when inspectorMode is "expanded"', async () => {
    act(() => {
      useUI.getState().setInspectorMode('expanded');
      useUI.getState().closeCitationsDrawer();
    });
    const { findByTestId } = renderAtRoute(<WriteScreen />, {
      path: '/s/:spaceId/d/:docId',
      initialEntries: ['/s/s1/d/d1'],
    });
    expect(await findByTestId('doc-inspector')).toBeInTheDocument();
  });

  it('hides the inspector when focus=1 even if inspectorMode is set', async () => {
    act(() => {
      useUI.getState().setInspectorMode('expanded');
    });
    const { findByTestId, queryByTestId } = renderAtRoute(<WriteScreen />, {
      path: '/s/:spaceId/d/:docId',
      initialEntries: ['/s/s1/d/d1?focus=1'],
    });
    await findByTestId('editor-stub');
    expect(queryByTestId('doc-inspector')).not.toBeInTheDocument();
    expect(queryByTestId('doc-inspector-icons')).not.toBeInTheDocument();
  });
});
