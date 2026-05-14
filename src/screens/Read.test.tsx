import { vi } from 'vitest';
import { renderAtRoute } from '@/test/test-utils';
import { seedBasicSpace } from '@/test/fixtures';

vi.mock('@/editor/EditorFacade', () => ({
  Editor: (p: { initialValue: string; mode: string }) => (
    <div data-testid="editor-stub" data-mode={p.mode}>
      {p.initialValue || '(empty)'}
    </div>
  ),
}));

const { ReadScreen } = await import('./Read');

describe('ReadScreen', () => {
  beforeEach(seedBasicSpace);

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
});
