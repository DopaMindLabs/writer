import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { sampleSection } from '@/test/fixtures';
import type { Section } from '@/db/schema';
import { SectionHeader } from './SectionHeader';

const workshop: Section = { ...sampleSection, id: 'sec-ws', label: 'Workshop' };

const setup = (
  over: Partial<React.ComponentProps<typeof SectionHeader>> = {},
) => {
  const onAdd = vi.fn();
  renderWithProviders(
    <SectionHeader
      section={sampleSection}
      docCount={2}
      containsActiveDoc={false}
      canManage
      onAdd={onAdd}
      {...over}
    />,
  );
  return { onAdd };
};

describe('SectionHeader', () => {
  it('renders the section label and its kebab menu', () => {
    setup();
    expect(
      screen.getByTestId('sidebar-section-sec1-header'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-section-sec1-label')).toHaveTextContent(
      'Drafts',
    );
    expect(screen.getByTestId('sidebar-section-sec1-menu')).toBeInTheDocument();
  });

  it('starts an inline rename on double-click for a modifiable section', async () => {
    const user = userEvent.setup();
    setup();
    await user.dblClick(screen.getByTestId('sidebar-section-sec1-label'));
    expect(
      await screen.findByTestId('sidebar-section-sec1-rename-input'),
    ).toBeInTheDocument();
  });

  it('does not rename the Workshop section on double-click', async () => {
    const user = userEvent.setup();
    setup({ section: workshop });
    await user.dblClick(screen.getByTestId('sidebar-section-sec-ws-label'));
    expect(
      screen.queryByTestId('sidebar-section-sec-ws-rename-input'),
    ).not.toBeInTheDocument();
  });

  it('does not rename on double-click when the space cannot be managed', async () => {
    const user = userEvent.setup();
    setup({ canManage: false });
    await user.dblClick(screen.getByTestId('sidebar-section-sec1-label'));
    expect(
      screen.queryByTestId('sidebar-section-sec1-rename-input'),
    ).not.toBeInTheDocument();
  });

  it('adds a document from the kebab menu', async () => {
    const user = userEvent.setup();
    const { onAdd } = setup();
    await user.click(screen.getByTestId('sidebar-section-sec1-menu'));
    await user.click(await screen.findByTestId('sidebar-section-sec1-add-doc'));
    expect(onAdd).toHaveBeenCalledOnce();
  });
});
