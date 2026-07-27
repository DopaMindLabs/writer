import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { JournalRetentionSelector } from './JournalRetentionSelector';

describe('JournalRetentionSelector', () => {
  it('offers every window the policy accepts', () => {
    renderWithProviders(
      <JournalRetentionSelector value={30} onChange={vi.fn()} ariaLabel="Keep sync history for" />,
    );

    expect(screen.getByText('7 days')).toBeInTheDocument();
    expect(screen.getByText('30 days')).toBeInTheDocument();
    expect(screen.getByText('90 days')).toBeInTheDocument();
    expect(screen.getByText('1 year')).toBeInTheDocument();
  });

  it('reports the chosen window in days', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(days: number) => void>();
    renderWithProviders(
      <JournalRetentionSelector value={30} onChange={onChange} ariaLabel="Keep sync history for" />,
    );

    await user.click(screen.getByText('90 days'));

    expect(onChange).toHaveBeenCalledWith(90);
  });

  it('carries an accessible name', () => {
    renderWithProviders(
      <JournalRetentionSelector value={30} onChange={vi.fn()} ariaLabel="Keep sync history for" />,
    );

    expect(screen.getByRole('group', { name: 'Keep sync history for' })).toBeInTheDocument();
  });
});
