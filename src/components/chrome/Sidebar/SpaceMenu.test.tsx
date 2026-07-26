import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { sampleSpace } from '@/test/fixtures';
import { SpaceMenu } from './SpaceMenu';

describe('SpaceMenu', () => {
  it('renders a trigger with an accessible name', () => {
    renderWithProviders(<SpaceMenu space={sampleSpace} onRename={vi.fn()} />);
    expect(
      screen.getByTestId('sidebar-space-menu-trigger'),
    ).toHaveAccessibleName('Open space menu');
  });

  it('keeps the menu closed until the trigger is activated', () => {
    renderWithProviders(<SpaceMenu space={sampleSpace} onRename={vi.fn()} />);
    expect(screen.queryByTestId('space-menu-popover')).not.toBeInTheDocument();
  });

  it('opens the space menu popover with the space name when the trigger is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SpaceMenu space={sampleSpace} onRename={vi.fn()} />);
    await user.click(screen.getByTestId('sidebar-space-menu-trigger'));
    const popover = await screen.findByTestId('space-menu-popover');
    expect(popover).toHaveTextContent(sampleSpace.name);
    expect(
      screen.getByTestId('space-menu-popover-rename'),
    ).toBeInTheDocument();
  });

  it('calls onRename when the Rename item is chosen', async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();
    renderWithProviders(<SpaceMenu space={sampleSpace} onRename={onRename} />);
    await user.click(screen.getByTestId('sidebar-space-menu-trigger'));
    await user.click(await screen.findByTestId('space-menu-popover-rename'));
    expect(onRename).toHaveBeenCalledOnce();
  });
});
