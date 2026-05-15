import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { render, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import { FIXED_TIME } from '@/test/fixtures';
import type { Doc } from '@/db/schema';

vi.mock('@/editor/EditorFacade', () => ({
  Editor: (props: {
    initialValue: string;
    mode: string;
    placeholder?: string;
    onChange?: (s: string) => void;
  }) => (
    <button
      type="button"
      data-testid="editor-stub"
      data-mode={props.mode}
      data-placeholder={props.placeholder}
      onClick={() => props.onChange?.('new-serialized-body')}
    >
      {props.initialValue || '(empty)'}
    </button>
  ),
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
});
