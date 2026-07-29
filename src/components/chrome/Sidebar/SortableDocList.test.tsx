import type { ComponentProps } from 'react';
import { DndContext } from '@/components/libs/dnd';
import { renderWithProviders, screen } from '@/test/test-utils';
import type { Doc } from '@/db/schema';
import { sampleMetadata } from '@/test/fixtures';
import { SortableDocList } from './SortableDocList';

const makeDoc = (over: Partial<Doc> = {}): Doc => ({
  ...sampleMetadata(),
  id: 'd1',
  spaceId: 's1',
  sectionId: 'sec1',
  name: 'Sample Doc',
  body: '',
  meta: { wordCount: 0 },
  updatedAt: 0,
  ...over,
});

const threeDocs: Doc[] = [
  makeDoc({ id: 'dA', name: 'Alpha' }),
  makeDoc({ id: 'dB', name: 'Beta' }),
  makeDoc({ id: 'dC', name: 'Gamma' }),
];

const renderList = (
  over: Partial<ComponentProps<typeof SortableDocList>> = {},
) =>
  renderWithProviders(
    <DndContext>
      <SortableDocList
        docs={threeDocs}
        activeDocId={null}
        canManage
        docHref={(id) => `/s/s1/d/${id}`}
        {...over}
      />
    </DndContext>,
    { initialEntries: ['/s/s1'] },
  );

const follows = (a: Element, b: Element): number =>
  a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING;

describe('SortableDocList', () => {
  it('renders its documents in the given order', () => {
    renderList();
    const rows = ['dA', 'dB', 'dC'].map((id) =>
      screen.getByTestId(`sidebar-doc-${id}-sortable`),
    );
    expect(follows(rows[0], rows[1])).toBeGreaterThan(0);
    expect(follows(rows[1], rows[2])).toBeGreaterThan(0);
  });

  it('marks only the active document', () => {
    renderList({ activeDocId: 'dB' });
    expect(screen.getByTestId('sidebar-doc-dB-name')).toHaveClass('font-medium');
    expect(
      screen.getByTestId('sidebar-doc-dA-name'),
    ).not.toHaveClass('font-medium');
  });

  it('links each row through the provided docHref', () => {
    renderList({ docHref: (id) => `/read/${id}` });
    expect(screen.getByTestId('sidebar-doc-dA')).toHaveAttribute(
      'href',
      '/read/dA',
    );
  });

  it('renders no document rows for an empty list', () => {
    renderList({ docs: [] });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
