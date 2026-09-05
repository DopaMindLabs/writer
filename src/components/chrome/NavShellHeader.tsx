import { useTranslation } from 'react-i18next';
import type { Space } from '@/db/schema';
import { NavShellBrandLink } from './NavShellBrandLink';
import { Eyebrow } from '@/components/ui/Eyebrow';

export type NavShellVariant = 'global' | 'space';

interface NavShellHeaderProps {
  variant: NavShellVariant;
  space: Space | null;
  subtitleOverride?: string;
}

export const NavShellHeader = ({
  variant,
  space,
  subtitleOverride,
}: NavShellHeaderProps) => {
  const { t } = useTranslation('screens');
  const isSpace = variant === 'space';
  const title = isSpace ? space?.name ?? '…' : 'LIpsum Writer';
  const subtitle =
    subtitleOverride ??
    (isSpace ? t('settings.space.shellSubtitle') : t('settings.shellSubtitle'));

  return (
    <div className="flex items-center gap-3 border-b border-rule px-6 pb-4 pt-5">
      <NavShellBrandLink isSpace={isSpace} space={space} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-serif text-[20px] font-medium leading-none -tracking-[0.01em] text-ink">
          {title}
        </div>
        <Eyebrow size={9} className="mt-1">
          {subtitle}
        </Eyebrow>
      </div>
    </div>
  );
};
