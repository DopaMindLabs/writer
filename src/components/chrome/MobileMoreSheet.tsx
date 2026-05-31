import { useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  DialogPrimitiveClose,
  DialogPrimitiveContent,
  DialogPrimitiveOverlay,
  DialogPrimitivePortal,
  DialogPrimitiveRoot,
  DialogPrimitiveTitle,
} from '@/components/ui/dialog.primitives';
import { useUI } from '@/store/ui';
import { ComingSoon } from '@/components/settings/ComingSoon';
import { Link } from '@/components/ui/Link';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

interface MobileMoreSheetProps {
  spaceId: string | null;
  docId?: string | null;
}

type ModeKey = 'write' | 'read' | 'split';

export const MobileMoreSheet = ({ spaceId, docId }: MobileMoreSheetProps) => {
  const { t } = useTranslation(['chrome', 'common']);
  const open = useUI((s) => s.mobileMoreOpen);
  const setOpen = useUI((s) => s.setMobileMoreOpen);

  return (
    <DialogPrimitiveRoot open={open} onOpenChange={setOpen}>
      <DialogPrimitivePortal>
        <DialogPrimitiveOverlay
          className={cn(
            'fixed inset-0 z-50 bg-black/40 md:hidden',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          )}
        />
        <DialogPrimitiveContent
          aria-describedby={undefined}
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 flex max-h-[80vh] flex-col rounded-t-2xl bg-paper pb-[env(safe-area-inset-bottom)] shadow-xl md:hidden',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom duration-200',
          )}
          data-testid="mobile-more-sheet"
        >
          <DialogPrimitiveTitle className="sr-only">
            {t('mobileMore.title')}
          </DialogPrimitiveTitle>
          <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-rule" aria-hidden />

          <ModeSection spaceId={spaceId} docId={docId} />
          <MenuSection spaceId={spaceId} />
        </DialogPrimitiveContent>
      </DialogPrimitivePortal>
    </DialogPrimitiveRoot>
  );
};

const ModeSection = ({ spaceId, docId }: MobileMoreSheetProps) => {
  const { t } = useTranslation(['chrome', 'common']);
  const location = useLocation();
  const [params] = useSearchParams();
  const focused = params.get('focus') === '1';

  const modes: { key: ModeKey; href: string | null }[] = [
    {
      key: 'write',
      href:
        spaceId && docId
          ? `${routes.docWrite(spaceId, docId)}${focused ? '?focus=1' : ''}`
          : spaceId
            ? routes.spaceWrite(spaceId)
            : null,
    },
    {
      key: 'read',
      href: spaceId && docId ? routes.docRead(spaceId, docId) : null,
    },
    {
      key: 'split',
      href: spaceId && docId ? routes.docSplit(spaceId, docId) : null,
    },
  ];

  const modeActive = (key: ModeKey): boolean => {
    const p = location.pathname;
    if (key === 'read') return p.endsWith('/read');
    if (key === 'split') return p.endsWith('/split');
    return !p.endsWith('/read') && !p.endsWith('/split') && !p.endsWith('/dump');
  };

  return (
    <div className="px-4 pb-2 pt-4">
      <div className="font-mono text-[9px] uppercase tracking-wider text-ink-4">
        {t('mobileMore.modeLabel')}
      </div>
      <div className="mt-2 flex gap-1.5">
        {modes.map((m) => (
          <ModeButton key={m.key} mode={m} active={modeActive(m.key)} />
        ))}
      </div>
    </div>
  );
};

const ModeButton = ({
  mode,
  active,
}: {
  mode: { key: ModeKey; href: string | null };
  active: boolean;
}) => {
  const { t } = useTranslation(['chrome', 'common']);
  const className = cn(
    'flex-1 border px-3 py-2 text-center text-[12px] uppercase tracking-wider',
    active
      ? 'border-ink bg-ink font-medium text-paper'
      : 'border-rule bg-paper text-ink',
  );
  if (!mode.href) {
    return (
      <ComingSoon hint={t(`modeToggle.${mode.key}`)} className="flex-1">
        <span className={cn(className, 'block w-full')}>
          {t(`modeToggle.${mode.key}`)}
        </span>
      </ComingSoon>
    );
  }
  return (
    <DialogPrimitiveClose asChild>
      <Link to={mode.href} className={className}>
        {t(`modeToggle.${mode.key}`)}
      </Link>
    </DialogPrimitiveClose>
  );
};

const MenuSection = ({ spaceId }: { spaceId: string | null }) => {
  const { t } = useTranslation(['chrome', 'common']);
  return (
    <div className="px-4 pb-3 pt-4">
      <div className="font-mono text-[9px] uppercase tracking-wider text-ink-4">
        {t('mobileMore.menuLabel')}
      </div>
      <ul className="mt-1 flex flex-col">
        <MoreItem
          to={spaceId ? routes.spaceSettings(spaceId) : routes.settings()}
          label={t(
            spaceId ? 'mobileMore.spaceSettings' : 'mobileMore.settings',
          )}
        />
        <MoreItem to={routes.settings()} label={t('mobileMore.settings')} />
        <MoreItem to={routes.about()} label={t('mobileMore.about')} />
        <MoreItem to={routes.help()} label={t('mobileMore.help')} />
        <ComingSoonItem label={t('mobileMore.whatsNew')} />
        <ComingSoonItem label={t('mobileMore.feedback')} />
      </ul>
    </div>
  );
};

const MoreItem = ({ to, label }: { to: string; label: string }) => {
  return (
    <li>
      <DialogPrimitiveClose asChild>
        <Link
          to={to}
          className="flex w-full items-center border-b border-rule/60 px-1 py-3 text-[14px] text-ink hover:bg-paper-2"
        >
          {label}
        </Link>
      </DialogPrimitiveClose>
    </li>
  );
};

const ComingSoonItem = ({ label }: { label: string }) => {
  return (
    <li>
      <ComingSoon hint={label} className="w-full">
        <span className="flex w-full items-center border-b border-rule/60 px-1 py-3 text-[14px] text-ink">
          {label}
        </span>
      </ComingSoon>
    </li>
  );
};
