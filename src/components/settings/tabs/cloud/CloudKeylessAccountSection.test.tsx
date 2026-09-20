import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { CloudKeylessAccountSection } from './CloudKeylessAccountSection';
import { KeyEscrowPresence, SyncPhase } from 'writer-sync/core';

const handlers = () => ({ onUnlock: vi.fn(), onSetUp: vi.fn(), onRetry: vi.fn() });

describe('CloudKeylessAccountSection', () => {
  it('offers no key-minting action while the account pull is in progress', () => {
    renderWithProviders(
      <CloudKeylessAccountSection presence={KeyEscrowPresence.Unknown} syncPhase={SyncPhase.Pulling} {...handlers()} />,
    );
    expect(screen.getByTestId('cloud-keyless-checking')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('surfaces a retry when an unknown pull has failed', async () => {
    const h = handlers();
    renderWithProviders(
      <CloudKeylessAccountSection presence={KeyEscrowPresence.Unknown} syncPhase={SyncPhase.Error} {...h} />,
    );
    expect(screen.getByTestId('cloud-keyless-fetch-failed')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(h.onRetry).toHaveBeenCalledTimes(1);
    expect(h.onSetUp).not.toHaveBeenCalled();
  });

  it('offers Unlock when the account already has a key', async () => {
    const h = handlers();
    renderWithProviders(
      <CloudKeylessAccountSection presence={KeyEscrowPresence.Present} syncPhase={SyncPhase.InSync} {...h} />,
    );
    expect(screen.getByTestId('cloud-keyless-locked')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button'));
    expect(h.onUnlock).toHaveBeenCalledTimes(1);
    expect(h.onSetUp).not.toHaveBeenCalled();
  });

  it('offers Set up when the account has no key yet', async () => {
    const h = handlers();
    renderWithProviders(
      <CloudKeylessAccountSection presence={KeyEscrowPresence.None} syncPhase={SyncPhase.InSync} {...h} />,
    );
    expect(screen.getByTestId('cloud-keyless-nokey')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button'));
    expect(h.onSetUp).toHaveBeenCalledTimes(1);
    expect(h.onUnlock).not.toHaveBeenCalled();
  });
});
