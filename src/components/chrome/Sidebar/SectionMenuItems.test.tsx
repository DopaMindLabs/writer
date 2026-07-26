import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SectionMenuItems } from './SectionMenuItems';

const setup = (
  over: Partial<React.ComponentProps<typeof SectionMenuItems>> = {},
) => {
  const onAddDoc = vi.fn();
  const onRename = vi.fn();
  const onDelete = vi.fn();
  renderWithProviders(
    <DropdownMenu>
      <DropdownMenuTrigger data-testid="section-menu-trigger">
        Open
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <SectionMenuItems
          sectionId="sec1"
          canModify
          isWorkshop={false}
          onAddDoc={onAddDoc}
          onRename={onRename}
          onDelete={onDelete}
          {...over}
        />
      </DropdownMenuContent>
    </DropdownMenu>,
  );
  return { onAddDoc, onRename, onDelete };
};

const openMenu = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByTestId('section-menu-trigger'));
};

describe('SectionMenuItems', () => {
  it('offers add, rename and delete when the section is modifiable', async () => {
    const user = userEvent.setup();
    setup();
    await openMenu(user);
    expect(
      await screen.findByTestId('sidebar-section-sec1-add-doc'),
    ).toHaveTextContent('Add document');
    expect(screen.getByTestId('sidebar-section-sec1-rename')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-section-sec1-delete')).toBeInTheDocument();
  });

  it('hides rename and delete when the section is not modifiable', async () => {
    const user = userEvent.setup();
    setup({ canModify: false });
    await openMenu(user);
    expect(
      await screen.findByTestId('sidebar-section-sec1-add-doc'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('sidebar-section-sec1-rename'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('sidebar-section-sec1-delete'),
    ).not.toBeInTheDocument();
  });

  it('labels the add action "Add workspace" for the Workshop', async () => {
    const user = userEvent.setup();
    setup({ isWorkshop: true });
    await openMenu(user);
    expect(
      await screen.findByTestId('sidebar-section-sec1-add-doc'),
    ).toHaveTextContent('Add workspace');
  });

  it('calls onAddDoc when the add item is chosen', async () => {
    const user = userEvent.setup();
    const { onAddDoc } = setup();
    await openMenu(user);
    await user.click(await screen.findByTestId('sidebar-section-sec1-add-doc'));
    expect(onAddDoc).toHaveBeenCalledOnce();
  });

  it('calls onRename when the rename item is chosen', async () => {
    const user = userEvent.setup();
    const { onRename } = setup();
    await openMenu(user);
    await user.click(await screen.findByTestId('sidebar-section-sec1-rename'));
    expect(onRename).toHaveBeenCalledOnce();
  });

  it('calls onDelete when the delete item is chosen', async () => {
    const user = userEvent.setup();
    const { onDelete } = setup();
    await openMenu(user);
    await user.click(await screen.findByTestId('sidebar-section-sec1-delete'));
    expect(onDelete).toHaveBeenCalledOnce();
  });
});
