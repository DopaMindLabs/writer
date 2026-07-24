import { vi } from 'vitest';
import type { ComponentProps } from 'react';
import { DndContext } from '@/components/libs/dnd';
import { renderWithProviders, screen } from '@/test/test-utils';
import { sampleDoc, sampleSection } from '@/test/fixtures';
import type { AddController } from './Sidebar.types';
import { SortableSection } from './SortableSection';

const idleAdd = (): AddController => ({
  adding: null,
  inputRef: { current: null },
  onChange: vi.fn(),
  onKeyDown: vi.fn(),
  onBlur: vi.fn(),
});

const baseProps = (): ComponentProps<typeof SortableSection> => ({
  sec: sampleSection,
  docs: [sampleDoc],
  spaceId: 's1',
  activeDocId: null,
  onBrainSpace: false,
  notesCount: 0,
  canManage: true,
  docHref: (id: string) => `/s/s1/d/${id}`,
  startAdd: vi.fn(),
  add: idleAdd(),
});

const renderSection = (
  over: Partial<ComponentProps<typeof SortableSection>> = {},
) =>
  renderWithProviders(
    <DndContext>
      <SortableSection {...baseProps()} {...over} />
    </DndContext>,
    { initialEntries: ['/s/s1'] },
  );

describe('SortableSection', () => {
  it('renders the section wrapper without a dragging marker when idle', () => {
    renderSection();
    expect(
      screen.getByTestId('sidebar-section-sec1-sortable'),
    ).not.toHaveAttribute('data-dragging');
  });

  it('renders its section header and documents', () => {
    renderSection();
    expect(screen.getByTestId('sidebar-section-sec1-label')).toHaveTextContent(
      'Drafts',
    );
    expect(screen.getByTestId('sidebar-doc-d1')).toHaveTextContent('Sample Doc');
  });

  it('wires the header as a drag surface when management is enabled', () => {
    renderSection({ canManage: true });
    expect(screen.getByTestId('sidebar-section-sec1-header')).toHaveClass(
      'cursor-grab',
    );
  });

  it('does not wire a drag surface when management is disabled', () => {
    renderSection({ canManage: false });
    expect(
      screen.getByTestId('sidebar-section-sec1-header'),
    ).not.toHaveClass('cursor-grab');
  });

  it('never wires a drag surface for the reserved Workshop section', () => {
    renderSection({
      canManage: true,
      sec: { ...sampleSection, label: 'Workshop' },
    });
    expect(
      screen.getByTestId('sidebar-section-sec1-header'),
    ).not.toHaveClass('cursor-grab');
  });
});
