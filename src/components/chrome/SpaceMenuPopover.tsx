import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBackups } from '@/hooks/useBackups';
import type { Space } from '@/db/schema';
import { createSpaceBackup } from '@/lib/backup/createSpaceBackup';
import { downloadBlob } from '@/lib/file-download';
import { routes } from '@/lib/routes';
import { ComingSoon } from '@/components/settings/ComingSoon';
import { PopoverClose } from '@/components/ui/popover';
import { Link } from '@/components/ui/Link';
import { cn } from '@/lib/utils';

interface SpaceMenuPopoverProps {
  space: Space;
  onRename: () => void;
}

interface ItemProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: string | number;
  kbd?: string;
  danger?: boolean;
  muted?: boolean;
  disabled?: boolean;
  testId?: string;
}

const ItemInner = ({
  children,
  badge,
  kbd,
  danger,
  muted,
  disabled,
  testId,
}: Omit<ItemProps, 'href' | 'onClick'>) => (
  <span
    className={cn(
      'flex w-full items-center gap-2 px-3.5 py-1.5 text-[13px]',
      danger ? 'text-ink' : 'text-ink-2',
      muted && 'text-ink-4',
      disabled
        ? 'cursor-not-allowed'
        : 'cursor-pointer hover:bg-paper-2 hover:text-ink',
    )}
  >
    <span className="flex-1 text-left">{children}</span>
    {badge !== undefined && (
      <span
        data-testid={testId ? `${testId}-badge` : undefined}
        className="font-mono text-[9px] tracking-wider text-ink-3"
      >
        {badge}
      </span>
    )}
    {kbd && <span className="font-mono text-[10px] text-ink-4">{kbd}</span>}
  </span>
);

const Item = ({
  children,
  href,
  onClick,
  badge,
  kbd,
  danger,
  muted,
  disabled,
  testId,
}: ItemProps) => {
  const inner = (
    <ItemInner
      badge={badge}
      kbd={kbd}
      danger={danger}
      muted={muted}
      disabled={disabled}
      testId={testId}
    >
      {children}
    </ItemInner>
  );
  if (disabled)
    return (
      <span data-testid={testId} className="block w-full">
        {inner}
      </span>
    );
  if (href) {
    return (
      <PopoverClose asChild>
        <Link to={href} data-testid={testId} className="block w-full">
          {inner}
        </Link>
      </PopoverClose>
    );
  }
  return (
    <PopoverClose asChild>
      <button
        type="button"
        onClick={onClick}
        data-testid={testId}
        className="block w-full text-left"
      >
        {inner}
      </button>
    </PopoverClose>
  );
};

const Divider = () => {
  return <div className="my-1 h-px bg-rule" />;
};

export const SpaceMenuPopover = ({ space, onRename }: SpaceMenuPopoverProps) => {
  const { t } = useTranslation('chrome');
  const backups = useBackups(space.id);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { backup, filename } = await createSpaceBackup(space.id);
      downloadBlob(backup.payload, filename);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      data-testid="space-menu-popover"
      className="w-60 bg-paper font-sans pb-1.5"
    >
      <div className="border-b border-rule px-3.5 pb-2.5 pt-3">
        <div className="font-serif text-[15px] font-medium tracking-tight text-ink">
          {space.name}
        </div>
        <div className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-ink-3">
          {t('spaceMenu.thisSpace')}
        </div>
      </div>

      <SpaceMenuItems
        space={space}
        onRename={onRename}
        backups={backups}
        exporting={exporting}
        onExport={() => { void handleExport(); }}
      />
    </div>
  );
};

interface SpaceMenuItemsProps {
  space: Space;
  onRename: () => void;
  backups: ReturnType<typeof useBackups>;
  exporting: boolean;
  onExport: () => void;
}

const SpaceMenuItems = ({
  space,
  onRename,
  backups,
  exporting,
  onExport,
}: SpaceMenuItemsProps) => {
  const { t } = useTranslation('chrome');
  return (
    <div className="pt-1">
      <Item onClick={onRename} testId="space-menu-popover-rename">
        {t('spaceMenu.rename')}
      </Item>
      <Item
        href={routes.spaceSettings(space.id)}
        testId="space-menu-popover-settings"
      >
        {t('spaceMenu.settings')}
      </Item>
      <Item
        href={`${routes.spaceSettings(space.id)}?tab=backups`}
        badge={backups.length > 0 ? backups.length : undefined}
        testId="space-menu-popover-backups"
      >
        {t('spaceMenu.backups')}
      </Item>

      <ComingSoon hint={t('spaceMenu.members')} side="right" className="w-full">
        <Item disabled testId="space-menu-popover-members">
          {t('spaceMenu.members')}
        </Item>
      </ComingSoon>

      <Item onClick={onExport} testId="space-menu-popover-export">
        {exporting ? t('spaceMenu.exporting') : t('spaceMenu.export')}
      </Item>

      <Divider />

      <ComingSoon hint={t('spaceMenu.duplicate')} side="right" className="w-full">
        <Item disabled muted testId="space-menu-popover-duplicate">
          {t('spaceMenu.duplicate')}
        </Item>
      </ComingSoon>

      <Item
        href={`${routes.spaceSettings(space.id)}?tab=danger`}
        danger
        testId="space-menu-popover-delete"
      >
        {t('spaceMenu.delete')}
      </Item>
    </div>
  );
};
