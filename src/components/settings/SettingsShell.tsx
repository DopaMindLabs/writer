import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SpaceRail } from '@/components/chrome/SpaceRail';
import { cn } from '@/lib/utils';
import type { Space } from '@/db/schema';
import {
  SettingsTabs,
  type SettingsTabGroup,
} from './SettingsTabs';

type SettingsShellVariant = 'global' | 'space';

interface SettingsNavHeaderProps {
  variant: SettingsShellVariant;
  space: Space | null;
}

const SettingsNavHeader = ({ variant, space }: SettingsNavHeaderProps) => {
  const { t } = useTranslation('screens');
  const isSpace = variant === 'space';
  const title = isSpace ? space?.name ?? '…' : 'LIpsum Writer';
  const subtitle = isSpace
    ? t('settings.space.shellSubtitle')
    : t('settings.shellSubtitle');
  const badge = isSpace ? space?.tag ?? '·' : 'L';

  return (
    <div className="flex items-center gap-3 border-b border-rule px-6 pb-4 pt-5">
      <div
        className={cn(
          'flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md',
          isSpace
            ? 'bg-ink font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-paper'
            : 'border border-rule font-serif text-[16px] text-ink',
        )}
        aria-hidden
      >
        {badge}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-serif text-[20px] font-medium leading-none -tracking-[0.01em] text-ink">
          {title}
        </div>
        <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.089em] text-ink-3">
          {subtitle}
        </div>
      </div>
    </div>
  );
};

interface SettingsShellProps {
  variant: SettingsShellVariant;
  groups: SettingsTabGroup[];
  active: string;
  onSelect: (id: string) => void;
  children: ReactNode;
  space?: Space | null;
  activeSpaceId?: string | null;
}

export const SettingsShell = ({
  variant,
  groups,
  active,
  onSelect,
  children,
  space = null,
  activeSpaceId = null,
}: SettingsShellProps) => {
  return (
    <div className="flex h-full w-full bg-paper text-ink">
      <div className="hidden md:flex">
        <SpaceRail activeSpaceId={activeSpaceId} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="flex min-h-0 shrink-0 flex-col border-r border-rule bg-paper-2 md:w-[240px]">
          <SettingsNavHeader variant={variant} space={space} />
          <SettingsTabs groups={groups} active={active} onSelect={onSelect} />
        </div>
        <main className="flex-1 overflow-auto bg-paper">
          <div className="max-w-[880px] px-4 pb-20 pt-6 md:px-12 md:pt-9">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
