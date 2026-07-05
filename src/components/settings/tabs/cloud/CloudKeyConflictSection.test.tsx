import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { CloudKeyConflictSection } from './CloudKeyConflictSection';

describe('CloudKeyConflictSection', () => {
  it('shows the conflict banner and opens the resolution dialog on demand', async () => {
    renderWithProviders(<CloudKeyConflictSection onResolved={vi.fn()} />);

    expect(
      screen.getByText(/locked on another device/i),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('cloud-conflict-dialog')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /unlock now/i }));
    expect(screen.getByTestId('cloud-conflict-dialog')).toBeInTheDocument();
  });
});
