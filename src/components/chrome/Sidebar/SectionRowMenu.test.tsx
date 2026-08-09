import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { sampleSection } from '@/test/fixtures';
import type { Section } from '@/db/schema';
import { SectionRowMenu } from './SectionRowMenu';

const workshop: Section = { ...sampleSection, id: 'sec-ws', label: 'Workshop' };

const setup = (over: Partial<React.ComponentProps<typeof SectionRowMenu>> = {}) => {
  const onAddDoc = vi.fn();
  const onAddNotebook = vi.fn();
  const onRename = vi.fn();
  renderWithProviders(
    <SectionRowMenu
      section={sampleSection}
      docCount={2}
      containsActiveDoc={false}
      canModify
      isWorkshop={false}
      onAddDoc={onAddDoc}
      onAddNotebook={onAddNotebook}
      onRename={onRename}
      {...over}
    />,
  );
  return { onAddDoc, onAddNotebook, onRename };
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

  it('offers Add workspace and New notebook when the section is the Workshop', async () => {
    const user = userEvent.setup();
    setup({ section: workshop, canModify: false, isWorkshop: true });
    await user.click(await screen.findByTestId('sidebar-section-sec-ws-menu'));
    const addItem = screen.getByTestId('sidebar-section-sec-ws-add-doc');
    expect(addItem).toBeInTheDocument();
    expect(addItem).toHaveTextContent('Add workspace');
    expect(screen.getByTestId('sidebar-section-sec-ws-add-notebook')).toHaveTextContent(
      'New notebook',
    );
    expect(
      screen.queryByTestId('sidebar-section-sec-ws-rename'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('sidebar-section-sec-ws-delete'),
    ).not.toBeInTheDocument();
  });

  it('labels the add item "Add document" for an ordinary section', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(await screen.findByTestId('sidebar-section-sec1-menu'));
    expect(
      screen.getByTestId('sidebar-section-sec1-add-doc'),
    ).toHaveTextContent('Add document');
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
