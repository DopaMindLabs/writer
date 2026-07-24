import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from './context-menu';

const Harness = ({ onRemove = vi.fn() }: { onRemove?: () => void }) => {
  const [colour, setColour] = useState('yellow');
  return (
    <ContextMenu>
      <ContextMenuTrigger data-testid="target">right-click me</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuLabel>Highlight</ContextMenuLabel>
        <ContextMenuItem onSelect={onRemove}>Remove highlight</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuRadioGroup value={colour} onValueChange={setColour}>
          <ContextMenuRadioItem value="yellow">Yellow</ContextMenuRadioItem>
          <ContextMenuRadioItem value="pink">Pink</ContextMenuRadioItem>
        </ContextMenuRadioGroup>
      </ContextMenuContent>
    </ContextMenu>
  );
};

const openMenu = (): void => {
  fireEvent.contextMenu(screen.getByTestId('target'));
};

describe('ContextMenu primitives', () => {
  it('opens on context menu and fires item actions', async () => {
    const onRemove = vi.fn();
    renderWithProviders(<Harness onRemove={onRemove} />);
    openMenu();
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Remove highlight' }),
    );
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it('radio group reflects the checked item', async () => {
    renderWithProviders(<Harness />);
    openMenu();
    const yellow = await screen.findByRole('menuitemradio', { name: 'Yellow' });
    expect(yellow).toHaveAttribute('aria-checked', 'true');

    await userEvent.click(screen.getByRole('menuitemradio', { name: 'Pink' }));
    openMenu();
    expect(await screen.findByRole('menuitemradio', { name: 'Pink' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('closes on escape', async () => {
    renderWithProviders(<Harness />);
    openMenu();
    expect(await screen.findByRole('menu')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });
});
