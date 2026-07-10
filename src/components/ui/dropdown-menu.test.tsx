import { renderWithProviders, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';

const Harness = ({ onSelect = vi.fn() }: { onSelect?: () => void }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>open</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onSelect}>Rename</DropdownMenuItem>
        <DropdownMenuItem disabled>Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

describe('DropdownMenu primitives', () => {
  it('opens on trigger click and renders label, separator, items', async () => {
    renderWithProviders(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'open' }));
    expect(await screen.findByText('Actions')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Rename' })).toBeInTheDocument();
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('fires onSelect when an item is chosen', async () => {
    const onSelect = vi.fn();
    renderWithProviders(<Harness onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: 'open' }));
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Rename' }),
    );
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('renders disabled items with data-disabled attribute', async () => {
    renderWithProviders(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'open' }));
    const del = await screen.findByRole('menuitem', { name: 'Delete' });
    expect(del).toHaveAttribute('data-disabled');
  });

  describe('snapshot', () => {
    it('should match the snapshot of the open menu with label, separator, and items', async () => {
      const { baseElement } = renderWithProviders(<Harness />);
      await userEvent.click(screen.getByRole('button', { name: 'open' }));
      expect(await screen.findByText('Actions')).toBeInTheDocument();
      expect(baseElement).toMatchSnapshot();
    });
  });
});
