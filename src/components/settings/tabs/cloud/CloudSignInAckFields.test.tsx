import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { CloudSignInAckFields } from './CloudSignInAckFields';

const renderFields = (
  overrides: Partial<Parameters<typeof CloudSignInAckFields>[0]> = {},
) =>
  renderWithProviders(
    <CloudSignInAckFields
      acknowledged={false}
      onAcknowledged={vi.fn()}
      backupConfirmed={false}
      onBackupConfirmed={vi.fn()}
      onCancel={vi.fn()}
      onConfirm={vi.fn()}
      {...overrides}
    />,
  );

describe('CloudSignInAckFields', () => {
  it('shows the terms in a red warning banner with both ticks and actions', () => {
    renderFields();
    expect(screen.getByTestId('cloud-signin-ack-warning')).toHaveClass('border-danger');
    expect(screen.getByRole('checkbox', { name: /temporary evaluation account/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /local device sync/i })).toBeInTheDocument();
    expect(screen.getByTestId('cloud-signin-ack-cancel')).toBeInTheDocument();
    expect(screen.getByTestId('cloud-signin-ack-continue')).toBeDisabled();
  });

  it('reports tick changes and enables continue only via the acknowledgement', async () => {
    const onAcknowledged = vi.fn();
    const onBackupConfirmed = vi.fn();
    renderFields({ onAcknowledged, onBackupConfirmed });
    await userEvent.click(
      screen.getByRole('checkbox', { name: /temporary evaluation account/i }),
    );
    expect(onAcknowledged).toHaveBeenCalledWith(true);
    await userEvent.click(screen.getByRole('checkbox', { name: /local device sync/i }));
    expect(onBackupConfirmed).toHaveBeenCalledWith(true);
  });

  it('enables continue once acknowledged', () => {
    renderFields({ acknowledged: true });
    expect(screen.getByTestId('cloud-signin-ack-continue')).toBeEnabled();
  });

  it('wires cancel and confirm to the actions', async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    renderFields({ acknowledged: true, onCancel, onConfirm });
    await userEvent.click(screen.getByTestId('cloud-signin-ack-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByTestId('cloud-signin-ack-continue'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
