import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { CloudDeviceResetControl } from './CloudDeviceResetControl';

describe('CloudDeviceResetControl', () => {
  it('guards the reset behind a confirmation', async () => {
    const onReset = vi.fn(async () => {});
    renderWithProviders(<CloudDeviceResetControl onReset={onReset} />);

    await userEvent.click(
      screen.getByRole('button', { name: /reset this device instead/i }),
    );
    expect(onReset).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('keeps a retryable alert when the reset fails', async () => {
    const onReset = vi.fn().mockRejectedValue(new Error('reset failed'));
    renderWithProviders(<CloudDeviceResetControl onReset={onReset} />);

    await userEvent.click(
      screen.getByRole('button', { name: /reset this device instead/i }),
    );
    await userEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /couldn't reset this device/i,
    );

    const retry = screen.getByRole('button', { name: /try again/i });
    retry.focus();
    await userEvent.keyboard('{Enter}');
    expect(onReset).toHaveBeenCalledTimes(2);
  });

  it('disables the reset action while a reset is in flight', async () => {
    let resolveReset: () => void = () => undefined;
    const onReset = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveReset = resolve;
        }),
    );
    renderWithProviders(<CloudDeviceResetControl onReset={onReset} />);

    await userEvent.click(
      screen.getByRole('button', { name: /reset this device instead/i }),
    );
    await userEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    expect(
      screen.getByRole('button', { name: /reset this device instead/i }),
    ).toBeDisabled();
    resolveReset();
  });
});
