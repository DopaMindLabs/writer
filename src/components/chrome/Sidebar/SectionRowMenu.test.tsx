import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { sampleSection } from '@/test/fixtures';
import type { Section } from '@/db/schema';
import { SectionRowMenu } from './SectionRowMenu';

const workshop: Section = { ...sampleSection, id: 'sec-ws', label: 'Workshop' };

const setup = (over: Partial<React.ComponentProps<typeof SectionRowMenu>> = {}) => {
  const onAddDoc = vi.fn();
  const onRename = vi.fn();
  renderWithProviders(
    <SectionRowMenu
      section={sampleSection}
      docCount={2}
      containsActiveDoc={false}
      canModify
      onAddDoc={onAddDoc}
      onRename={onRename}
      {...over}
    />,
  );
  return { onAddDoc, onRename };
};

describe('SectionRowMenu', () => {
  it('renders a trigger with an accessible name', async () => {
    setup();
    const trigger = await screen.findByTestId('sidebar-section-sec1-menu');
    expect(trigger).toHaveAccessibleName('Options for Drafts section');
  });

  it('offers Add document, Rename, and Delete when the section is modifiable', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(await screen.findByTestId('sidebar-section-sec1-menu'));
    expect(screen.getByTestId('sidebar-section-sec1-add-doc')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-section-sec1-rename')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-section-sec1-delete')).toBeInTheDocument();
  });

  it('offers only Add document when the section cannot be modified (Workshop)', async () => {
    const user = userEvent.setup();
    setup({ section: workshop, canModify: false });
    await user.click(await screen.findByTestId('sidebar-section-sec-ws-menu'));
    expect(
      screen.getByTestId('sidebar-section-sec-ws-add-doc'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('sidebar-section-sec-ws-rename'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('sidebar-section-sec-ws-delete'),
    ).not.toBeInTheDocument();
  });

  it('calls onAddDoc from the Add document item', async () => {
    const user = userEvent.setup();
    const { onAddDoc } = setup();
    await user.click(await screen.findByTestId('sidebar-section-sec1-menu'));
    await user.click(screen.getByTestId('sidebar-section-sec1-add-doc'));
    expect(onAddDoc).toHaveBeenCalledOnce();
  });

  it('calls onRename from the Rename item', async () => {
    const user = userEvent.setup();
    const { onRename } = setup();
    await user.click(await screen.findByTestId('sidebar-section-sec1-menu'));
    await user.click(screen.getByTestId('sidebar-section-sec1-rename'));
    expect(onRename).toHaveBeenCalledOnce();
  });

  it('opens the delete confirmation from the Delete item', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(await screen.findByTestId('sidebar-section-sec1-menu'));
    await user.click(screen.getByTestId('sidebar-section-sec1-delete'));
    expect(
      await screen.findByRole('dialog', { name: 'Delete section' }),
    ).toBeInTheDocument();
  });
});
