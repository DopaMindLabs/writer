import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { CloudKeylessAccountSection } from './CloudKeylessAccountSection';

const handlers = () => ({ onUnlock: vi.fn(), onSetUp: vi.fn() });

describe('CloudKeylessAccountSection', () => {
  it('offers no key-minting action while the account pull is unknown', () => {
    renderWithProviders(
      <CloudKeylessAccountSection presence="unknown" {...handlers()} />,
    );
    expect(screen.getByTestId('cloud-keyless-checking')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('offers Unlock when the account already has a key', async () => {
    const h = handlers();
    renderWithProviders(
      <CloudKeylessAccountSection presence="present" {...h} />,
    );
    expect(screen.getByTestId('cloud-keyless-locked')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button'));
    expect(h.onUnlock).toHaveBeenCalledTimes(1);
    expect(h.onSetUp).not.toHaveBeenCalled();
  });

  it('offers Set up when the account has no key yet', async () => {
    const h = handlers();
    renderWithProviders(<CloudKeylessAccountSection presence="none" {...h} />);
    expect(screen.getByTestId('cloud-keyless-nokey')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button'));
    expect(h.onSetUp).toHaveBeenCalledTimes(1);
    expect(h.onUnlock).not.toHaveBeenCalled();
  });
});
