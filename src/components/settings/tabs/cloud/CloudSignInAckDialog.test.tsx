import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { CloudSignInAckDialog } from './CloudSignInAckDialog';

const renderDialog = (
  overrides: Partial<Parameters<typeof CloudSignInAckDialog>[0]> = {},
) =>
  renderWithProviders(
    <CloudSignInAckDialog
      open
      onOpenChange={vi.fn()}
      onConfirm={vi.fn()}
      {...overrides}
    />,
  );

describe('CloudSignInAckDialog', () => {
  it('explains the evaluation account and disables continue until acknowledged', async () => {
    renderDialog();
    expect(await screen.findByTestId('cloud-signin-ack-dialog')).toBeInTheDocument();
    expect(screen.getByText(/no server of its own/i)).toBeInTheDocument();
    expect(screen.getByText(/valid for 3 days/i)).toBeInTheDocument();
    expect(screen.getByTestId('cloud-signin-ack-continue')).toBeDisabled();
  });

  it('carries the terms in a red warning banner', async () => {
    renderDialog();
    const banner = await screen.findByTestId('cloud-signin-ack-warning');
    expect(banner).toHaveClass('border-danger');
    expect(screen.getByText(/no server of its own/i)).toHaveClass('text-danger');
    expect(screen.getByText(/valid for 3 days/i)).toHaveClass('text-danger');
  });

  it('enables continue once the acknowledgement is ticked and confirms', async () => {
    const onConfirm = vi.fn();
    renderDialog({ onConfirm });
    await userEvent.click(
      screen.getByRole('checkbox', { name: /temporary evaluation account/i }),
    );
    const cont = screen.getByTestId('cloud-signin-ack-continue');
    expect(cont).toBeEnabled();
    await userEvent.click(cont);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('offers an optional backup tick that does not gate continue', async () => {
    renderDialog();
    const backup = screen.getByRole('checkbox', { name: /local device sync/i });
    expect(backup).not.toBeChecked();
    await userEvent.click(backup);
    // The backup tick alone does not enable continue — only the acknowledgement does.
    expect(screen.getByTestId('cloud-signin-ack-continue')).toBeDisabled();
    await userEvent.click(
      screen.getByRole('checkbox', { name: /temporary evaluation account/i }),
    );
    expect(screen.getByTestId('cloud-signin-ack-continue')).toBeEnabled();
  });

  it('cancel closes without confirming', async () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    renderDialog({ onConfirm, onOpenChange });
    await userEvent.click(screen.getByTestId('cloud-signin-ack-cancel'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('forgets the tick between openings so every sign-in re-acknowledges', async () => {
    const onOpenChange = vi.fn();
    const view = renderDialog({ onOpenChange });
    await userEvent.click(
      screen.getByRole('checkbox', { name: /temporary evaluation account/i }),
    );
    await userEvent.click(screen.getByTestId('cloud-signin-ack-cancel'));

    view.rerender(
      <CloudSignInAckDialog open onOpenChange={onOpenChange} onConfirm={vi.fn()} />,
    );
    expect(screen.getByTestId('cloud-signin-ack-continue')).toBeDisabled();
  });
});
