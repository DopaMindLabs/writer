import { vi } from 'vitest';
import type { ComponentProps } from 'react';
import { renderWithProviders, screen, within } from '@/test/test-utils';
import type { Doc, Section } from '@/db/schema';
import type { AddController } from './Sidebar.types';
import { SortableSectionList } from './SortableSectionList';

const makeDoc = (over: Partial<Doc> = {}): Doc => ({
  id: 'd1',
  spaceId: 's1',
  sectionId: 'secA',
  name: 'Sample Doc',
  body: '',
  meta: { wordCount: 0 },
  updatedAt: 0,
  ...over,
});

const secA: Section = {
  id: 'secA',
  spaceId: 's1',
  parentSectionId: null,
  label: 'Drafts',
  order: 0,
};
const secB: Section = { ...secA, id: 'secB', label: 'Notes', order: 1 };

const docsForSection = (): Map<string, Doc[]> =>
  new Map<string, Doc[]>([
    ['secA', [makeDoc({ id: 'dA', sectionId: 'secA', name: 'Alpha' })]],
    ['secB', [makeDoc({ id: 'dB', sectionId: 'secB', name: 'Beta' })]],
  ]);

const idleAdd = (): AddController => ({
  adding: null,
  inputRef: { current: null },
  onChange: vi.fn(),
  onKeyDown: vi.fn(),
  onBlur: vi.fn(),
});

const renderList = (
  over: Partial<ComponentProps<typeof SortableSectionList>> = {},
) =>
  renderWithProviders(
    <SortableSectionList
      topSections={[secA, secB]}
      docsForSection={docsForSection()}
      spaceId="s1"
      activeDocId={null}
      onBrainSpace={false}
      notesCount={0}
      canManage
      docHref={(id) => `/s/s1/d/${id}`}
      startAdd={vi.fn()}
      add={idleAdd()}
      {...over}
    />,
    { initialEntries: ['/s/s1'] },
  );

describe('SortableSectionList', () => {
  it('renders each section in order', () => {
    renderList();
    const a = screen.getByTestId('sidebar-section-secA-sortable');
    const b = screen.getByTestId('sidebar-section-secB-sortable');
    expect(
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeGreaterThan(0);
  });

  it('renders the documents belonging to each section', () => {
    renderList();
    const a = screen.getByTestId('sidebar-section-secA');
    const b = screen.getByTestId('sidebar-section-secB');
    expect(within(a).getByTestId('sidebar-doc-dA')).toHaveTextContent('Alpha');
    expect(within(b).getByTestId('sidebar-doc-dB')).toHaveTextContent('Beta');
  });

  it('renders a Brain space link inside a Workshop section', () => {
    const workshop: Section = { ...secA, id: 'secW', label: 'Workshop' };
    renderList({
      topSections: [workshop],
      docsForSection: new Map<string, Doc[]>([['secW', []]]),
      notesCount: 2,
    });
    expect(screen.getByTestId('sidebar-brain-space-link')).toHaveAttribute(
      'href',
      '/s/s1/brain-space',
    );
    expect(
      screen.getByTestId('sidebar-brain-space-link-count'),
    ).toHaveTextContent('2◦');
  });
});
