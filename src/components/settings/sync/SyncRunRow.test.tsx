import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { SyncRunRow } from './SyncRunRow';

describe('SyncRunRow', () => {
  it('runs the sync on click', () => {
    const onSync = vi.fn();
    renderWithProviders(
      <SyncRunRow
        busy={false}
        disabled={false}
        idleLabel="Sync now"
        onSync={onSync}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Sync now' }));
    expect(onSync).toHaveBeenCalledOnce();
  });

  it('disables the button while busy', () => {
    renderWithProviders(
      <SyncRunRow
        busy
        disabled={false}
        idleLabel="Sync now"
        onSync={vi.fn()}
      />,
    );
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows a last-synced caption only when lastSyncedAt is provided', () => {
    const { rerender } = renderWithProviders(
      <SyncRunRow
        busy={false}
        disabled={false}
        idleLabel="Sync now"
        onSync={vi.fn()}
      />,
    );
    expect(screen.queryByText(/never|last synced/i)).not.toBeInTheDocument();

    rerender(
      <SyncRunRow
        busy={false}
        disabled={false}
        idleLabel="Sync now"
        onSync={vi.fn()}
        lastSyncedAt={null}
      />,
    );
    expect(screen.getByText(/never/i)).toBeInTheDocument();
  });

  it('shows a relative "last synced" caption for a real timestamp', () => {
    renderWithProviders(
      <SyncRunRow
        busy={false}
        disabled={false}
        idleLabel="Sync now"
        onSync={vi.fn()}
        lastSyncedAt={Date.now()}
      />,
    );
    expect(screen.getByText(/synced/i)).toBeInTheDocument();
  });

  describe('snapshot', () => {
    it('should match the snapshot across idle, busy, never-synced, and synced states', () => {
      // A fixed, well-past timestamp renders as a stable ISO date.
      const fixed = Date.UTC(2024, 0, 1, 0, 0, 0);
      const { container } = renderWithProviders(
        <div>
          <SyncRunRow
            busy={false}
            disabled={false}
            idleLabel="Sync now"
            onSync={() => undefined}
          />
          <SyncRunRow
            busy
            disabled={false}
            idleLabel="Sync now"
            onSync={() => undefined}
          />
          <SyncRunRow
            busy={false}
            disabled={false}
            idleLabel="Sync now"
            onSync={() => undefined}
            lastSyncedAt={null}
          />
          <SyncRunRow
            busy={false}
            disabled={false}
            idleLabel="Sync now"
            onSync={() => undefined}
            lastSyncedAt={fixed}
          />
        </div>,
      );
      expect(container).toMatchSnapshot();
    });
  });
});
