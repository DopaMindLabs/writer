import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { renameSpace } from '@/lib/space/spaceRepository';
import type { Space } from '@/db/schema';
import { SpaceMenu } from './SpaceMenu';
import { SpaceSubtitle } from './SpaceSubtitle';

interface SpaceHeaderProps {
  spaceId: string;
  space: Space | undefined;
}

export const SpaceHeader = ({ spaceId, space }: SpaceHeaderProps) => {
  const { t } = useTranslation(['chrome', 'common']);
  const [editingSpaceName, setEditingSpaceName] = useState(false);
  const [draftSpaceName, setDraftSpaceName] = useState(space?.name ?? '');

  useEffect(() => {
    if (!editingSpaceName) setDraftSpaceName(space?.name ?? '');
  }, [space?.name, editingSpaceName]);

  const commitSpaceName = async () => {
    setEditingSpaceName(false);
    if (draftSpaceName.trim() === space?.name) return;
    await renameSpace(spaceId, draftSpaceName);
  };

  return (
    <div className="group border-b border-rule px-5 pb-4 pt-5">
      {editingSpaceName ? (
        <TextField
          variant="bare"
          autoFocus
          value={draftSpaceName}
          onChange={(e) => { setDraftSpaceName(e.target.value); }}
          onBlur={() => { void commitSpaceName(); }}
          onFocus={(e) => { e.currentTarget.select(); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') {
              setDraftSpaceName(space?.name ?? '');
              setEditingSpaceName(false);
            }
          }}
          aria-label={t('chrome:sidebar.renameSpace')}
          data-testid="sidebar-space-title-input"
          className="font-serif text-lg font-medium leading-tight tracking-tight"
        />
      ) : (
        <div className="flex items-center gap-2" data-tour="tour-sidebar-space-title">
          <Button
            kind="bare"
            size="none"
            onClick={() => { if (space) setEditingSpaceName(true); }}
            disabled={!space}
            title={space ? t('chrome:sidebar.renameSpace') : undefined}
            data-testid="sidebar-space-title"
            className="block min-w-0 flex-1 cursor-text truncate text-left font-serif text-lg font-medium leading-tight tracking-tight text-ink"
          >
            {space?.name ?? '…'}
          </Button>
          {space ? (
            <SpaceMenu
              space={space}
              onRename={() => { setEditingSpaceName(true); }}
            />
          ) : null}
        </div>
      )}
      <SpaceSubtitle space={space} />
    </div>
  );
};
