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
  it('offers set-up/unlock and a disabled sign-in before a key exists', () => {
    renderWithProviders(
      <CloudEncryptionControls hasKey={false} signedIn={false} {...handlers()} />,
    );
    expect(screen.getByTestId('cloud-setup')).toBeInTheDocument();
    expect(screen.getByTestId('cloud-unlock')).toBeInTheDocument();
    // Passphrase before sign-in.
    expect(screen.getByTestId('cloud-sign-in')).toBeDisabled();
    expect(screen.queryByTestId('cloud-forget')).toBeNull();
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
