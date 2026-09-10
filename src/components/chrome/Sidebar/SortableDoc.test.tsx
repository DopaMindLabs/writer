import type { ComponentProps } from 'react';
import { DndContext } from '@/components/libs/dnd';
import { renderWithProviders, screen } from '@/test/test-utils';
import type { Doc } from '@/db/schema';
import { sampleMetadata } from '@/test/fixtures';
import { SortableDoc } from './SortableDoc';

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

const renderDoc = (
  over: Partial<ComponentProps<typeof SortableDoc>> = {},
) =>
  renderWithProviders(
    <DndContext>
      <SortableDoc doc={makeDoc()} href="/s/s1/d/d1" active={false} canManage {...over} />
    </DndContext>,
    { initialEntries: ['/s/s1'] },
  );

describe('SortableDoc', () => {
  it('renders the document row without a dragging marker when idle', () => {
    renderDoc();
    const wrapper = screen.getByTestId('sidebar-doc-d1-sortable');
    expect(wrapper).not.toHaveAttribute('data-dragging');
    expect(screen.getByTestId('sidebar-doc-d1')).toHaveTextContent('Sample Doc');
  });

  it('links the row to the provided href', () => {
    renderDoc({ href: '/s/s1/d/d1/read' });
    expect(screen.getByTestId('sidebar-doc-d1')).toHaveAttribute(
      'href',
      '/s/s1/d/d1/read',
    );
  });

  it('marks the row active through its document link', () => {
    renderDoc({ active: true });
    expect(screen.getByTestId('sidebar-doc-d1-name')).toHaveClass('font-medium');
  });

  it('adds a grab surface when management is enabled', () => {
    renderDoc({ canManage: true });
    expect(screen.getByTestId('sidebar-doc-d1-sortable')).toHaveClass('cursor-grab');
  });

  it('omits the grab surface when management is disabled', () => {
    renderDoc({ canManage: false });
    expect(
      screen.getByTestId('sidebar-doc-d1-sortable'),
    ).not.toHaveClass('cursor-grab');
  });
});
