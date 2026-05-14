import { vi } from 'vitest';
import { render } from '@/test/test-utils';
import { FIXED_TIME } from '@/test/fixtures';
import type { Doc } from '@/db/schema';

vi.mock('@/editor/EditorFacade', () => ({
  Editor: (props: {
    initialValue: string;
    mode: string;
    placeholder?: string;
  }) => (
    <div
      data-testid="editor-stub"
      data-mode={props.mode}
      data-placeholder={props.placeholder}
    >
      {props.initialValue || '(empty)'}
    </div>
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
});
