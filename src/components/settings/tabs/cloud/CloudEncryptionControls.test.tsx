import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { CloudEncryptionControls } from './CloudEncryptionControls';

const handlers = () => ({
  onSetUp: vi.fn(),
  onUnlock: vi.fn(),
  onSignIn: vi.fn(),
  onSignOut: vi.fn(),
  onForget: vi.fn(),
});

describe('CloudEncryptionControls', () => {
  it('offers set-up/unlock and an enabled sign-in before a key exists (clean device may sign in first)', async () => {
    const h = handlers();
    renderWithProviders(
      <CloudEncryptionControls hasKey={false} signedIn={false} {...h} />,
    );
    expect(screen.getByTestId('cloud-setup')).toBeInTheDocument();
    expect(screen.getByTestId('cloud-unlock')).toBeInTheDocument();
    const signIn = screen.getByTestId('cloud-sign-in');
    expect(signIn).toBeEnabled();
    await userEvent.click(signIn);
    expect(h.onSignIn).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('cloud-forget')).toBeNull();
  });

  it('shows sign-out (not sign-in) while signed in without a key', async () => {
    const h = handlers();
    renderWithProviders(<CloudEncryptionControls hasKey={false} signedIn {...h} />);
    expect(screen.queryByTestId('cloud-sign-in')).toBeNull();
    await userEvent.click(screen.getByTestId('cloud-sign-out'));
    expect(h.onSignOut).toHaveBeenCalledTimes(1);
    // Set-up/unlock stay available so the user can acquire a key.
    expect(screen.getByTestId('cloud-setup')).toBeInTheDocument();
  });

  it('enables sign-in once keyed and signed out', async () => {
    const h = handlers();
    renderWithProviders(<CloudEncryptionControls hasKey signedIn={false} {...h} />);
    const signIn = screen.getByTestId('cloud-sign-in');
    expect(signIn).toBeEnabled();
    await userEvent.click(signIn);
    expect(h.onSignIn).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('cloud-setup')).toBeNull();
  });

  it('offers sign-out and forget when signed in', async () => {
    const h = handlers();
    renderWithProviders(<CloudEncryptionControls hasKey signedIn {...h} />);
    expect(screen.getByTestId('cloud-sign-in')).toBeDisabled();
    await userEvent.click(screen.getByTestId('cloud-sign-out'));
    expect(h.onSignOut).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByTestId('cloud-forget'));
    expect(h.onForget).toHaveBeenCalledTimes(1);
  });
});
