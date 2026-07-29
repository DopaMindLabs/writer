import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { CloudResetErrorBanner } from './CloudResetErrorBanner';

describe('CloudResetErrorBanner', () => {
  it('announces the failure assertively and retries on action', async () => {
    const onRetry = vi.fn();
    renderWithProviders(<CloudResetErrorBanner onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      /couldn't reset this device/i,
    );
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
