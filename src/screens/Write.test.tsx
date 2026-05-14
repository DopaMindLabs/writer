import { vi } from 'vitest';
import { renderAtRoute } from '@/test/test-utils';
import { seedBasicSpace } from '@/test/fixtures';

vi.mock('@/editor/EditorFacade', () => ({
  Editor: (p: { initialValue: string; mode: string; placeholder?: string }) => (
    <div data-testid="editor-stub" data-mode={p.mode}>
      {p.initialValue || '(empty)'}
    </div>
  ),
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

  it('renders focus rail when focus=1', async () => {
    const { findByTestId } = renderAtRoute(<WriteScreen />, {
      path: '/s/:spaceId/d/:docId',
      initialEntries: ['/s/s1/d/d1?focus=1'],
    });
    const editor = await findByTestId('editor-stub');
    expect(editor.getAttribute('data-mode')).toBe('focus');
  });
});
