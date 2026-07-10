import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { BootErrorScreen } from './BootErrorScreen';

describe('BootErrorScreen', () => {
  it('renders the boot error label and message', () => {
    render(<BootErrorScreen error={new Error('boom')} onReset={vi.fn()} />);
    expect(screen.getByText('Boot error')).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  it('does not reset until the user confirms the destructive dialog', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(<BootErrorScreen error={new Error('boom')} onReset={onReset} />);

    await user.click(screen.getByRole('button', { name: 'Reset local data…' }));
    expect(onReset).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Erase everything' }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('cancelling the dialog leaves local data untouched', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(<BootErrorScreen error={new Error('boom')} onReset={onReset} />);

    await user.click(screen.getByRole('button', { name: 'Reset local data…' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onReset).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('button', { name: 'Erase everything' }),
    ).not.toBeInTheDocument();
  });
});
