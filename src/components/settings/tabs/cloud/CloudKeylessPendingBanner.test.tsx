import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { CloudKeylessPendingBanner } from './CloudKeylessPendingBanner';

describe('CloudKeylessPendingBanner', () => {
  it('shows a neutral checking notice with no action while a pull is in progress', () => {
    renderWithProviders(
      <CloudKeylessPendingBanner syncPhase="pulling" onRetry={vi.fn()} />,
    );
    expect(screen.getByTestId('cloud-keyless-checking')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('offers a retry when the account fetch has failed', async () => {
    const onRetry = vi.fn();
    renderWithProviders(
      <CloudKeylessPendingBanner syncPhase="error" onRetry={onRetry} />,
    );
    expect(screen.getByTestId('cloud-keyless-fetch-failed')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('tells an offline device sync will resume, with no action to take', () => {
    renderWithProviders(
      <CloudKeylessPendingBanner syncPhase="offline" onRetry={vi.fn()} />,
    );
    expect(screen.getByTestId('cloud-keyless-offline')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
