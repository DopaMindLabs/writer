import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { SyncFolderRow } from './SyncFolderRow';

describe('SyncFolderRow', () => {
  it('offers connect when no folder is set', () => {
    const onChoose = vi.fn();
    renderWithProviders(
      <SyncFolderRow folderName={null} hint="hint" onChoose={onChoose} />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onChoose).toHaveBeenCalledOnce();
  });

  it('offers change + disconnect in manage mode when a folder is set', () => {
    const onDisconnect = vi.fn();
    renderWithProviders(
      <SyncFolderRow
        folderName="Drafts"
        hint="hint"
        onChoose={vi.fn()}
        onDisconnect={onDisconnect}
      />,
    );
    expect(screen.getByText('Drafts')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('shows no buttons in connect-only mode once a folder is set', () => {
    renderWithProviders(
      <SyncFolderRow folderName="Drafts" hint="hint" onChoose={vi.fn()} />,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
