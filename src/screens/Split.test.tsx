import { vi } from 'vitest';
import { renderAtRoute } from '@/test/test-utils';
import { db } from '@/db/db';
import { FIXED_TIME, sampleSpace } from '@/test/fixtures';
import type { Doc } from '@/db/schema';

vi.mock('@/editor/EditorFacade', () => ({
  Editor: (p: { initialValue: string; mode: string }) => (
    <div data-testid="editor-stub" data-mode={p.mode}>
      {p.initialValue || '(empty)'}
    </div>
  ),
}));

const { SplitScreen } = await import('./Split');

const docA: Doc = {
  id: 'd1',
  spaceId: 's1',
  sectionId: 'sec1',
  name: 'Left Doc',
  body: 'left body',
  meta: { wordCount: 0 },
  updatedAt: FIXED_TIME,
};
const docB: Doc = {
  ...docA,
  id: 'd2',
  name: 'Right Doc',
  body: 'right body',
};

async function seed() {
  await db.spaces.put(sampleSpace);
  await db.docs.bulkPut([docA, docB]);
}

describe('SplitScreen', () => {
  beforeEach(seed);

  it('renders both editor panes', async () => {
    const { findAllByTestId } = renderAtRoute(<SplitScreen />, {
      path: '/s/:spaceId/d/:docId/split',
      initialEntries: ['/s/s1/d/d1/split?with=d2'],
    });
    const editors = await findAllByTestId('editor-stub');
    expect(editors).toHaveLength(2);
  });

  it('redirects when params are missing', () => {
    const { queryByTestId } = renderAtRoute(<SplitScreen />, {
      path: '/orphan',
      initialEntries: ['/orphan'],
    });
    expect(queryByTestId('catch-all')).toBeInTheDocument();
  });
});
