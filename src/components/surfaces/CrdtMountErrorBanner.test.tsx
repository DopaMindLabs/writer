import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render } from '@/test/test-utils';
import { CrdtMountErrorBanner } from './CrdtMountErrorBanner';

describe('CrdtMountErrorBanner', () => {
  it('announces the failure assertively', () => {
    const { getByRole } = render(<CrdtMountErrorBanner onRetry={vi.fn()} />);
    expect(getByRole('alert')).toHaveTextContent(/couldn't open this document/i);
  });

  it('retries from its keyboard-operable action', async () => {
    const onRetry = vi.fn();
    const { getByRole } = render(<CrdtMountErrorBanner onRetry={onRetry} />);
    const retry = getByRole('button', { name: /try again/i });
    retry.focus();
    await userEvent.keyboard('{Enter}');
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
