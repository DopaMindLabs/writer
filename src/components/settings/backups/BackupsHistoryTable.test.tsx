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

  it('formats sizes and relative times across every bucket', () => {
    const now = Date.now();
    const rows = [
      // 90s ago → "1 min ago"; 512 bytes → "512 B"
      { id: 'bytes', spaceId: 's1', when: now - 90_000, kind: 'manual', size: 512 },
      // 5.5min ago → "5 min ago"; 2048 bytes → "2.0 kB"
      { id: 'kb', spaceId: 's1', when: now - 330_000, kind: 'manual', size: 2048 },
      // 3h+1min ago → "3 h ago"; 5 MiB → "5.0 MB"
      { id: 'mb', spaceId: 's1', when: now - 10_860_000, kind: 'manual', size: 5 * 1024 * 1024 },
    ] as unknown as Backup[];
    renderWithProviders(
      <BackupsHistoryTable backups={rows} onDownload={vi.fn()} onDelete={vi.fn()} />,
    );
    const bytes = screen.getByTestId('backup-row-bytes');
    expect(bytes).toHaveTextContent('512 B');
    expect(bytes).toHaveTextContent('1 min ago');
    const kb = screen.getByTestId('backup-row-kb');
    expect(kb).toHaveTextContent('2.0 kB');
    expect(kb).toHaveTextContent('5 min ago');
    const mb = screen.getByTestId('backup-row-mb');
    expect(mb).toHaveTextContent('5.0 MB');
    expect(mb).toHaveTextContent('3 h ago');
  });

  it('omits the restore action when no handler is provided', () => {
    renderWithProviders(
      <BackupsHistoryTable
        backups={backups}
        onDownload={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('backup-row-b1-restore')).not.toBeInTheDocument();
  });

  it('fires restore for archive-v3 backups', () => {
    const onRestore = vi.fn();
    const rows = [
      { id: 'b1', when: Date.now(), kind: 'manual', size: 1, format: 'archive-v3' },
    ] as unknown as Backup[];
    renderWithProviders(
      <BackupsHistoryTable
        backups={rows}
        onDownload={vi.fn()}
        onDelete={vi.fn()}
        onRestore={onRestore}
      />,
    );
    const restoreBtn = screen.getByTestId('backup-row-b1-restore');
    expect(restoreBtn).toBeEnabled();
    fireEvent.click(restoreBtn);
    expect(onRestore).toHaveBeenCalledOnce();
  });

  it('disables restore for markdown-only backups and explains why', () => {
    const onRestore = vi.fn();
    const rows = [
      { id: 'b1', when: Date.now(), kind: 'manual', size: 1, format: 'md-zip' },
    ] as unknown as Backup[];
    renderWithProviders(
      <BackupsHistoryTable
        backups={rows}
        onDownload={vi.fn()}
        onDelete={vi.fn()}
        onRestore={onRestore}
      />,
    );
    const restoreBtn = screen.getByTestId('backup-row-b1-restore');
    expect(restoreBtn).toBeDisabled();
    expect(restoreBtn).toHaveAttribute(
      'title',
      expect.stringMatching(/predates restore/i),
    );
  });

  describe('snapshot', () => {
    it('should match the snapshot for the empty state and a populated table', () => {
      const fixed = Date.UTC(2024, 0, 1, 0, 0, 0);
      const rows = [
        { id: 'b1', spaceId: 's1', when: fixed, kind: 'manual', size: 2048 },
        { id: 'b2', spaceId: 's1', when: fixed, kind: 'auto', size: 512 },
      ] as unknown as Backup[];
      const { container } = renderWithProviders(
        <div>
          <BackupsHistoryTable
            backups={[]}
            onDownload={() => undefined}
            onDelete={() => undefined}
          />
          <BackupsHistoryTable
            backups={rows}
            onDownload={() => undefined}
            onDelete={() => undefined}
          />
        </div>,
      );
      expect(container).toMatchSnapshot();
    });
  });
});
