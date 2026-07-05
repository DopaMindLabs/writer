import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { CloudKeyErrorScreen } from './CloudKeyErrorScreen';

describe('CloudKeyErrorScreen', () => {
  it('offers unlock as the primary recovery action', async () => {
    const onUnlock = vi.fn();
    renderWithProviders(
      <CloudKeyErrorScreen onUnlock={onUnlock} onReset={vi.fn()} />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: /unlock in settings/i }),
    );
    expect(onUnlock).toHaveBeenCalledTimes(1);
  });

  it('guards the destructive reset behind a confirmation', async () => {
    const onReset = vi.fn();
    renderWithProviders(
      <CloudKeyErrorScreen onUnlock={vi.fn()} onReset={onReset} />,
    );

    // Opening the reset dialog must not reset anything on its own.
    await userEvent.click(
      screen.getByRole('button', { name: /reset this device instead/i }),
    );
    expect(onReset).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
