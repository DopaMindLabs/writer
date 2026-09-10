import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { PairingCodePager } from './PairingCodePager';

describe('PairingCodePager', () => {
  it('announces the position politely rather than only showing it', () => {
    renderWithProviders(<PairingCodePager index={1} total={3} onChange={vi.fn()} />);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Symbol 2 of 3');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('steps forward and back by one', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(index: number) => void>();
    renderWithProviders(<PairingCodePager index={1} total={3} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Previous' }));

    expect(onChange).toHaveBeenNthCalledWith(1, 2);
    expect(onChange).toHaveBeenNthCalledWith(2, 0);
  });

  it('disables the step that would leave the sequence', () => {
    renderWithProviders(<PairingCodePager index={0} total={2} onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
  });

  it('is reachable by keyboard', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(index: number) => void>();
    renderWithProviders(<PairingCodePager index={0} total={2} onChange={onChange} />);

    await user.tab();
    await user.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalledWith(1);
  });
});
