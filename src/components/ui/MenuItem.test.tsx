import { render, renderWithProviders, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { Pencil } from '@/components/libs/icons';
import { MenuItem } from './MenuItem';
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from './popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';

describe('MenuItem', () => {
  describe('default button mount', () => {
    it('renders a button with the label', () => {
      render(<MenuItem label="Rename" icon={Pencil} />);
      const item = screen.getByRole('button', { name: 'Rename' });
      expect(item).toBeInTheDocument();
      expect(item.tagName).toBe('BUTTON');
      expect(item).toHaveAttribute('type', 'button');
    });

    it('renders a trailing shortcut', () => {
      render(<MenuItem label="Save" shortcut="S" />);
      expect(screen.getByText('S')).toBeInTheDocument();
    });

    it('hides the shortcut and shows a check when checked', () => {
      render(<MenuItem label="Medium" shortcut="M" checked />);
      expect(screen.queryByText('M')).not.toBeInTheDocument();
    });

    it('marks the destructive item and forwards data-danger', () => {
      render(<MenuItem label="Delete" danger />);
      expect(screen.getByRole('button', { name: 'Delete' })).toHaveAttribute(
        'data-danger',
        'true',
      );
    });

    it('disables interaction and exposes aria-disabled', async () => {
      const onClick = vi.fn();
      render(<MenuItem label="Nope" disabled onClick={onClick} />);
      const item = screen.getByRole('button', { name: 'Nope' });
      expect(item).toBeDisabled();
      expect(item).toHaveAttribute('aria-disabled', 'true');
      await userEvent.click(item, { pointerEventsCheck: 0 });
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('inside PopoverClose asChild', () => {
    it('renders as the closing control and dismisses the popover', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <Popover defaultOpen>
          <PopoverTrigger>open</PopoverTrigger>
          <PopoverContent>
            <PopoverClose asChild>
              <MenuItem label="Close me" />
            </PopoverClose>
          </PopoverContent>
        </Popover>,
      );
      const item = screen.getByRole('button', { name: 'Close me' });
      await user.click(item);
      expect(
        screen.queryByRole('button', { name: 'Close me' }),
      ).not.toBeInTheDocument();
    });
  });

  describe('via asChild on DropdownMenuItem', () => {
    it('adopts the menuitem role and fires onSelect', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      renderWithProviders(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem asChild onSelect={onSelect}>
              <MenuItem label="Rename" icon={Pencil} />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );
      const item = screen.getByRole('menuitem', { name: 'Rename' });
      expect(item.tagName).toBe('BUTTON');
      await user.click(item);
      expect(onSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe('own asChild', () => {
    it('renders the provided child as the row', () => {
      render(
        <MenuItem asChild>
          <a href="/settings">Settings</a>
        </MenuItem>,
      );
      const link = screen.getByRole('link', { name: 'Settings' });
      expect(link).toHaveAttribute('href', '/settings');
    });

    it('takes a disabled asChild link out of the tab order and blocks activation', () => {
      render(
        <MenuItem asChild disabled>
          <a href="/settings">Settings</a>
        </MenuItem>,
      );
      const link = screen.getByRole('link', { name: 'Settings' });
      expect(link).toHaveAttribute('aria-disabled', 'true');
      expect(link).toHaveAttribute('tabindex', '-1');
      // The guard prevents the default navigation on click (and Enter, which
      // dispatches a click on a link), so a router Link sees defaultPrevented.
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });
      link.dispatchEvent(clickEvent);
      expect(clickEvent.defaultPrevented).toBe(true);
    });
  });
});
