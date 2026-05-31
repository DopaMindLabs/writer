import { vi } from 'vitest';
import { act } from '@testing-library/react';
import { renderAtRoute } from '@/test/test-utils';
import { seedBasicSpace } from '@/test/fixtures';
import { useUI } from '@/store/ui';

vi.mock('@/editor/EditorFacade', () => ({
  Editor: (p: { initialValue: string; mode: string }) => (
    <div data-testid="editor-stub" data-mode={p.mode}>
      {p.initialValue || '(empty)'}
    </div>
  ),
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
