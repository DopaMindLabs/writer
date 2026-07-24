import { vi } from 'vitest';
import type { ComponentProps } from 'react';
import { DndContext } from '@/components/libs/dnd';
import { renderWithProviders, screen } from '@/test/test-utils';
import { sampleDoc, sampleSection } from '@/test/fixtures';
import type { Section } from '@/db/schema';
import type { AddController } from './Sidebar.types';
import { SidebarSection } from './SidebarSection';

const workshopSection: Section = {
  ...sampleSection,
  id: 'sec-ws',
  label: 'Workshop',
};

const idleAdd = (): AddController => ({
  adding: null,
  inputRef: { current: null },
  onChange: vi.fn(),
  onKeyDown: vi.fn(),
  onBlur: vi.fn(),
});

const baseProps = (): ComponentProps<typeof SidebarSection> => ({
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
  over: Partial<ComponentProps<typeof SidebarSection>> = {},
) =>
  renderWithProviders(
    <DndContext>
      <SidebarSection {...baseProps()} {...over} />
    </DndContext>,
    { initialEntries: ['/s/s1'] },
  );

describe('SidebarSection', () => {
  it('renders the section label and its documents', () => {
    renderSection();
    expect(screen.getByTestId('sidebar-section-sec1-label')).toHaveTextContent(
      'Drafts',
    );
    expect(screen.getByTestId('sidebar-doc-d1')).toHaveTextContent('Sample Doc');
  });

  it('renders the empty placeholder when the section has no documents', () => {
    renderSection({ docs: [] });
    expect(screen.getByTestId('sidebar-section-sec1-empty')).toHaveTextContent(
      '(empty)',
    );
    expect(screen.queryByTestId('sidebar-doc-d1')).not.toBeInTheDocument();
  });

  it('hides the empty placeholder when the section has documents', () => {
    renderSection();
    expect(
      screen.queryByTestId('sidebar-section-sec1-empty'),
    ).not.toBeInTheDocument();
  });

  it('renders the Brain space link for the Workshop section', () => {
    renderSection({ sec: workshopSection, docs: [], notesCount: 3 });
    expect(screen.getByTestId('sidebar-brain-space-link')).toHaveAttribute(
      'href',
      '/s/s1/brain-space',
    );
    expect(
      screen.getByTestId('sidebar-brain-space-link-count'),
    ).toHaveTextContent('3◦');
  });

  it('omits the Brain space link for an ordinary section', () => {
    renderSection();
    expect(
      screen.queryByTestId('sidebar-brain-space-link'),
    ).not.toBeInTheDocument();
  });
});
