import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import type { Backup } from '@/db/schema';
import { BackupsHistoryTable } from './BackupsHistoryTable';

const backups = [
  { id: 'b1', spaceId: 's1', when: Date.now(), kind: 'manual', size: 2048 },
] as unknown as Backup[];

describe('BackupsHistoryTable', () => {
  it('shows the empty state and no table when there are no backups', () => {
    renderWithProviders(
      <BackupsHistoryTable
        backups={[]}
        onDownload={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('backups-history')).not.toBeInTheDocument();
  });

  it('renders a row and fires download / delete', () => {
    const onDownload = vi.fn();
    const onDelete = vi.fn();
    renderWithProviders(
      <BackupsHistoryTable
        backups={backups}
        onDownload={onDownload}
        onDelete={onDelete}
      />,
    );
    expect(screen.getByTestId('backups-history')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('backup-row-b1-download'));
    expect(onDownload).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByTestId('backup-row-b1-delete'));
    expect(onDelete).toHaveBeenCalledOnce();
  });
});
