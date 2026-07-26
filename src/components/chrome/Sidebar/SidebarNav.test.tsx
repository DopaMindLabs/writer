import type { ComponentProps } from 'react';
import { renderWithProviders, screen } from '@/test/test-utils';
import { db } from '@/db/db';
import { sampleDoc, sampleSection, sampleSpace } from '@/test/fixtures';
import type { Section } from '@/db/schema';
import { SidebarNav } from './SidebarNav';

const renderNav = (over: Partial<ComponentProps<typeof SidebarNav>> = {}) =>
  renderWithProviders(
    <SidebarNav
      spaceId="s1"
      activeDocId={null}
      sections={[sampleSection]}
      notesCount={0}
      onBrainSpace={false}
      modeSuffix=""
      space={sampleSpace}
      {...over}
    />,
    { initialEntries: ['/s/s1'] },
  );

describe('SidebarNav', () => {
  it('renders the Documents navigation landmark and its sections', async () => {
    renderNav();
    expect(
      screen.getByRole('navigation', { name: 'Documents' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByTestId('sidebar-section-sec1-label'),
    ).toHaveTextContent('Drafts');
  });

  it('renders the documents that belong to the space', async () => {
    await db.docs.put(sampleDoc);
    renderNav();
    expect(await screen.findByTestId('sidebar-doc-d1')).toHaveTextContent(
      'Sample Doc',
    );
  });

  it('shows the add-section row when the template allows configuration', async () => {
    renderNav();
    expect(
      await screen.findByTestId('sidebar-add-section-trigger'),
    ).toBeInTheDocument();
  });

  it('hides the add-section row when no template has resolved', () => {
    renderNav({ space: undefined });
    expect(
      screen.queryByTestId('sidebar-add-section-trigger'),
    ).not.toBeInTheDocument();
  });

  it('renders the Workshop fallback when the sections lack a Workshop', async () => {
    renderNav({ notesCount: 3 });
    expect(
      await screen.findByTestId('sidebar-workshop-fallback-label'),
    ).toHaveTextContent('Workshop');
    expect(
      screen.getByTestId('sidebar-brain-space-link-count'),
    ).toHaveTextContent('3◦');
  });

  it('omits the fallback and links Brain space inline when a Workshop section exists', async () => {
    const workshop: Section = { ...sampleSection, id: 'sec-ws', label: 'Workshop' };
    renderNav({ sections: [workshop] });
    expect(
      await screen.findByTestId('sidebar-section-sec-ws'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('sidebar-workshop-fallback'),
    ).not.toBeInTheDocument();
    expect(screen.getAllByTestId('sidebar-brain-space-link')).toHaveLength(1);
  });
});
