import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBackups } from '@/hooks/useBackups';
import type { Space } from '@/db/schema';
import { createSpaceBackup } from '@/lib/backup/createSpaceBackup';
import { downloadBlob } from '@/lib/file-download';
import { ComingSoon } from '@/components/settings/ComingSoon';
import { PopoverClose } from '@/components/ui/popover';
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
}

const Item = ({
  children,
  href,
  onClick,
  badge,
  kbd,
  danger,
  muted,
  disabled,
}: ItemProps) => {
  const inner = (
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
        <span className="font-mono text-[9px] tracking-wider text-ink-3">
          {badge}
        </span>
      )}
      {kbd && (
        <span className="font-mono text-[10px] text-ink-4">{kbd}</span>
      )}
    </span>
  );
  if (disabled) return <span className="block w-full">{inner}</span>;
  if (href) {
    return (
      <PopoverClose asChild>
        <Link to={href} className="block w-full">
          {inner}
        </Link>
      </PopoverClose>
    );
  }
  return (
    <PopoverClose asChild>
      <button type="button" onClick={onClick} className="block w-full text-left">
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

      <div className="pt-1">
        <Item onClick={onRename}>{t('spaceMenu.rename')}</Item>
        <Item href={`/s/${space.id}/settings`}>{t('spaceMenu.settings')}</Item>
        <Item
          href={`/s/${space.id}/settings?tab=backups`}
          badge={backups.length > 0 ? backups.length : undefined}
        >
          {t('spaceMenu.backups')}
        </Item>

        <ComingSoon hint={t('spaceMenu.members')} side="right" className="w-full">
          <Item disabled>{t('spaceMenu.members')}</Item>
        </ComingSoon>

        <Item onClick={() => void handleExport()}>
          {exporting ? t('spaceMenu.exporting') : t('spaceMenu.export')}
        </Item>

        <Divider />

        <ComingSoon hint={t('spaceMenu.duplicate')} side="right" className="w-full">
          <Item disabled muted>
            {t('spaceMenu.duplicate')}
          </Item>
        </ComingSoon>

        <Item href={`/s/${space.id}/settings?tab=danger`} danger>
          {t('spaceMenu.delete')}
        </Item>
      </div>
    </div>
  );
};
