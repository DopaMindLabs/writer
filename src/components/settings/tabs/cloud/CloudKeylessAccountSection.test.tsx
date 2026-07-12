import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { CloudKeylessAccountSection } from './CloudKeylessAccountSection';

const handlers = () => ({ onUnlock: vi.fn(), onSetUp: vi.fn(), onRetry: vi.fn() });

describe('CloudKeylessAccountSection', () => {
  it('offers no key-minting action while the account pull is in progress', () => {
    renderWithProviders(
      <CloudKeylessAccountSection presence="unknown" syncPhase="pulling" {...handlers()} />,
    );
    expect(screen.getByTestId('cloud-keyless-checking')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('surfaces a retry when an unknown pull has failed', async () => {
    const h = handlers();
    renderWithProviders(
      <CloudKeylessAccountSection presence="unknown" syncPhase="error" {...h} />,
    );
    expect(screen.getByTestId('cloud-keyless-fetch-failed')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(h.onRetry).toHaveBeenCalledTimes(1);
    expect(h.onSetUp).not.toHaveBeenCalled();
  });

  it('offers Unlock when the account already has a key', async () => {
    const h = handlers();
    renderWithProviders(
      <CloudKeylessAccountSection presence="present" syncPhase="in-sync" {...h} />,
    );
    expect(screen.getByTestId('cloud-keyless-locked')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button'));
    expect(h.onUnlock).toHaveBeenCalledTimes(1);
    expect(h.onSetUp).not.toHaveBeenCalled();
  });

  it('offers Set up when the account has no key yet', async () => {
    const h = handlers();
    renderWithProviders(
      <CloudKeylessAccountSection presence="none" syncPhase="in-sync" {...h} />,
    );
    expect(screen.getByTestId('cloud-keyless-nokey')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button'));
    expect(h.onSetUp).toHaveBeenCalledTimes(1);
    expect(h.onUnlock).not.toHaveBeenCalled();
  });
});
