import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { getProfile } from '@/lib/account/profile';
import { AccountTab } from './AccountTab';

describe('AccountTab', () => {
  it('renders the account panel with a privacy notice', async () => {
    renderWithProviders(<AccountTab />);
    expect(await screen.findByTestId('account-privacy-notice')).toHaveTextContent(
      /never leaves this device/i,
    );
    expect(screen.getByTestId('setting-display-name')).toBeInTheDocument();
    expect(screen.getByTestId('setting-presence-hue')).toBeInTheDocument();
  });

  it('persists the display name as it is edited', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AccountTab />);
    const field = await screen.findByLabelText('Display name');
    await waitFor(() => {
      expect(field).not.toBeDisabled();
    });
    await user.type(field, 'Ada');
    await waitFor(async () => {
      expect((await getProfile()).displayName).toBe('Ada');
    });
  });

  it('persists a chosen presence hue', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AccountTab />);
    await user.click(await screen.findByRole('radio', { name: 'Moss' }));
    await waitFor(async () => {
      expect((await getProfile()).presenceHue).toBe('presence-3');
    });
  });
});
