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

const renderInPopover = (node: React.ReactElement) => {
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
};

describe('SpaceMenuPopover', () => {
  beforeEach(() => {
    createBackupMock.mockReset();
    downloadBlobMock.mockReset();
  });

  describe('rendering', () => {
    it('should render the popover with the space name and all menu entries', () => {
      renderInPopover(
        <SpaceMenuPopover space={sampleSpace} onRename={() => {}} />,
      );
      const popover = screen.getByTestId('space-menu-popover');
      expect(popover).toHaveTextContent(sampleSpace.name);
      expect(screen.getByTestId('space-menu-popover-rename')).toHaveTextContent(
        /rename/i,
      );
      expect(screen.getByTestId('space-menu-popover-settings')).toHaveAttribute(
        'href',
        `/s/${sampleSpace.id}/settings`,
      );
      expect(screen.getByTestId('space-menu-popover-backups')).toHaveAttribute(
        'href',
        `/s/${sampleSpace.id}/settings?tab=backups`,
      );
      expect(screen.getByTestId('space-menu-popover-members')).toHaveTextContent(
        /members/i,
      );
      expect(screen.getByTestId('space-menu-popover-export')).toHaveTextContent(
        /export/i,
      );
      expect(
        screen.getByTestId('space-menu-popover-duplicate'),
      ).toHaveTextContent(/duplicate/i);
      expect(screen.getByTestId('space-menu-popover-delete')).toHaveAttribute(
        'href',
        `/s/${sampleSpace.id}/settings?tab=danger`,
      );
    });
  });

  describe('rename', () => {
    it('should invoke onRename when the rename item is clicked', async () => {
      const onRename = vi.fn();
      renderInPopover(
        <SpaceMenuPopover space={sampleSpace} onRename={onRename} />,
      );
      await userEvent.click(screen.getByTestId('space-menu-popover-rename'));
      expect(onRename).toHaveBeenCalledTimes(1);
    });
  });

  describe('backups badge', () => {
    it('should show the count badge when at least one backup exists for the space', async () => {
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
      await waitFor(() => {
        const badge = screen.getByTestId('space-menu-popover-backups-badge');
        expect(badge).toHaveTextContent('1');
      });
    });
  });

  describe('export', () => {
    it('should run createSpaceBackup + downloadBlob when the export item is clicked', async () => {
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
      await userEvent.click(screen.getByTestId('space-menu-popover-export'));
      await waitFor(() => {
        expect(createBackupMock).toHaveBeenCalledWith(sampleSpace.id);
        expect(downloadBlobMock).toHaveBeenCalledWith(blob, 'space.zip');
      });
    });

    it('should flip to an "Exporting…" label while the backup is in flight', async () => {
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
      await userEvent.click(screen.getByTestId('space-menu-popover-export'));
      expect(screen.getByTestId('space-menu-popover-export')).toHaveTextContent(
        /exporting/i,
      );
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
          screen.getByTestId('space-menu-popover-export'),
        ).not.toHaveTextContent(/exporting/i);
      });
    });
  });

  describe('snapshot', () => {
    it('should match the snapshot across all variants', () => {
      const { container } = renderInPopover(
        <SpaceMenuPopover space={sampleSpace} onRename={() => {}} />,
      );
      expect(container).toMatchSnapshot('default');
    });
  });
});
