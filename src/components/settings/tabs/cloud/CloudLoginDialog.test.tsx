import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { CloudLoginDialog } from './CloudLoginDialog';
import type { DXCUserInteraction } from '@/lib/cloud/cloudClient';

type Submit = (params: Record<string, string>) => void;
type Alerts = DXCUserInteraction['alerts'];

const emailPrompt = (
  onSubmit: Submit = vi.fn(),
  onCancel: () => void = vi.fn(),
  alerts: Alerts = [],
): DXCUserInteraction => ({
  type: 'email',
  title: 'Sign in with email',
  alerts,
  fields: { email: { type: 'text', placeholder: 'you@example.com' } },
  submitLabel: 'Continue',
  cancelLabel: 'Cancel',
  onSubmit,
  onCancel,
});

const otpPrompt = (onSubmit: Submit = vi.fn()): DXCUserInteraction => ({
  type: 'otp',
  title: 'Enter code',
  alerts: [],
  fields: { otp: { type: 'text', label: 'One-time code' } },
  submitLabel: 'Verify',
  cancelLabel: 'Cancel',
  onSubmit,
  onCancel: vi.fn(),
});

describe('CloudLoginDialog', () => {
  it('renders nothing without an active interaction', () => {
    renderWithProviders(<CloudLoginDialog interaction={null} />);
    expect(screen.queryByTestId('cloud-login-dialog')).toBeNull();
  });

  it('drives the email step and submits the typed value', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<CloudLoginDialog interaction={emailPrompt(onSubmit)} />);
    const input = await screen.findByTestId('cloud-login-input');
    expect(input).toHaveAttribute('type', 'email');
    await userEvent.type(input, 'me@example.com');
    await userEvent.click(screen.getByTestId('cloud-login-submit'));
    expect(onSubmit).toHaveBeenCalledWith({ email: 'me@example.com' });
  });

  it('drives the OTP step', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<CloudLoginDialog interaction={otpPrompt(onSubmit)} />);
    await userEvent.type(await screen.findByTestId('cloud-login-input'), '123456');
    await userEvent.click(screen.getByTestId('cloud-login-submit'));
    expect(onSubmit).toHaveBeenCalledWith({ otp: '123456' });
  });

  it('renders alerts and cancels', async () => {
    const onCancel = vi.fn();
    const interaction = emailPrompt(vi.fn(), onCancel, [
      { type: 'info', messageCode: 'OTP_SENT', message: 'We sent you a code', messageParams: {} },
    ]);
    renderWithProviders(<CloudLoginDialog interaction={interaction} />);
    expect(await screen.findByText('We sent you a code')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('cloud-login-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
