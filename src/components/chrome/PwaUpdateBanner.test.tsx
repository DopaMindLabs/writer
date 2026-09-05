import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PwaUpdateBanner } from './PwaUpdateBanner';
import { pwaUpdateState } from '@/lib/pwa/updateState';

afterEach(() => {
  pwaUpdateState.set(false);
  pwaUpdateState.setApplyCallback(null);
});

describe('PwaUpdateBanner', () => {
  it('renders nothing until an update is ready', () => {
    render(<PwaUpdateBanner />);
    expect(screen.queryByTestId('pwa-update-banner')).not.toBeInTheDocument();
  });

  it('announces a ready update through a status banner', () => {
    pwaUpdateState.set(true);
    render(<PwaUpdateBanner />);
    const banner = screen.getByTestId('pwa-update-banner');
    expect(banner).toHaveAttribute('role', 'status');
    expect(banner).toHaveTextContent(/new version/i);
  });

  it('applies the update when the reload action is chosen', async () => {
    const apply = vi.fn();
    pwaUpdateState.setApplyCallback(apply);
    pwaUpdateState.set(true);
    const user = userEvent.setup();
    render(<PwaUpdateBanner />);

    await user.click(screen.getByRole('button', { name: /reload/i }));
    expect(apply).toHaveBeenCalledTimes(1);
  });
});
