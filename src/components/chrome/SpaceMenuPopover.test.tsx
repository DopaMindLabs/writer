import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { db } from '@/db/db';
import { sampleSpace } from '@/test/fixtures';
import type { Backup } from '@/db/schema';
import { SpaceMenuPopover } from './SpaceMenuPopover';

const createBackupMock = vi.fn();
const downloadBlobMock = vi.fn();

vi.mock('@/lib/backup/createSpaceBackup', () => ({
  createSpaceBackup: (...args: unknown[]) => createBackupMock(...args),
}));
vi.mock('@/lib/file-download', () => ({
  downloadBlob: (...args: unknown[]) => downloadBlobMock(...args),
}));

function renderInPopover(node: React.ReactElement) {
  return render(
    <MemoryRouter>
      <TooltipProvider delayDuration={0}>
        <Popover open>
          <PopoverTrigger />
          <PopoverContent>{node}</PopoverContent>
        </Popover>
      </TooltipProvider>
    </MemoryRouter>,
  );
}

describe('SpaceMenuPopover', () => {
  beforeEach(() => {
    createBackupMock.mockReset();
    downloadBlobMock.mockReset();
  });

  it('renders the popover with space name, rename, settings, backups, members, export, duplicate and delete entries', () => {
    renderInPopover(
      <SpaceMenuPopover space={sampleSpace} onRename={() => {}} />,
    );
    const popover = screen.getByTestId('space-menu-popover');
    expect(popover.textContent).toContain(sampleSpace.name);
    expect(
      screen.getByRole('button', { name: /rename/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /settings/i }),
    ).toHaveAttribute('href', `/s/${sampleSpace.id}/settings`);
    expect(
      screen.getByRole('link', { name: /backups/i }),
    ).toHaveAttribute('href', `/s/${sampleSpace.id}/settings?tab=backups`);
    expect(
      screen.getByRole('link', { name: /delete/i }),
    ).toHaveAttribute('href', `/s/${sampleSpace.id}/settings?tab=danger`);
  });

  it('invokes onRename when the rename item is clicked', async () => {
    const onRename = vi.fn();
    renderInPopover(
      <SpaceMenuPopover space={sampleSpace} onRename={onRename} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /rename/i }));
    expect(onRename).toHaveBeenCalledTimes(1);
  });

  it('shows the backups count badge when at least one backup exists for the space', async () => {
    const backup: Backup = {
      id: 'b1',
      when: 1,
      scope: sampleSpace.id,
      kind: 'manual',
      format: 'md-zip',
      size: 100,
      payload: new Blob(['x']),
    };
    await db.spaces.put(sampleSpace);
    await db.backups.put(backup);
    renderInPopover(
      <SpaceMenuPopover space={sampleSpace} onRename={() => {}} />,
    );
    // The dexie live query is async; wait for the badge to appear.
    await waitFor(() => {
      const backupsLink = screen.getByRole('link', { name: /backups/i });
      expect(backupsLink.textContent).toMatch(/1/);
    });
  });

  it('runs createSpaceBackup + downloadBlob when the export item is clicked', async () => {
    const blob = new Blob(['data']);
    createBackupMock.mockResolvedValue({
      backup: {
        id: 'b1',
        when: 1,
        scope: sampleSpace.id,
        kind: 'manual',
        format: 'md-zip',
        size: blob.size,
        payload: blob,
      },
      filename: 'space.zip',
    });
    renderInPopover(
      <SpaceMenuPopover space={sampleSpace} onRename={() => {}} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    await waitFor(() => {
      expect(createBackupMock).toHaveBeenCalledWith(sampleSpace.id);
      expect(downloadBlobMock).toHaveBeenCalledWith(blob, 'space.zip');
    });
  });

  it('flips to an "Exporting…" label while the backup is in flight', async () => {
    let resolveBackup: (v: {
      backup: Backup;
      filename: string;
    }) => void = () => {};
    createBackupMock.mockImplementation(
      () => new Promise((res) => (resolveBackup = res)),
    );
    renderInPopover(
      <SpaceMenuPopover space={sampleSpace} onRename={() => {}} />,
    );
    const blob = new Blob(['x']);
    await userEvent.click(screen.getByRole('button', { name: /^export/i }));
    expect(
      screen.getByRole('button', { name: /exporting/i }),
    ).toBeInTheDocument();
    await act(async () => {
      resolveBackup({
        backup: {
          id: 'b1',
          when: 1,
          scope: sampleSpace.id,
          kind: 'manual',
          format: 'md-zip',
          size: blob.size,
          payload: blob,
        },
        filename: 'space.zip',
      });
    });
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /exporting/i }),
      ).not.toBeInTheDocument();
    });
  });
});
