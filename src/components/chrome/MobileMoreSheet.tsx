import { useTranslation } from 'react-i18next';
import {
  DialogPrimitiveClose,
  DialogPrimitiveContent,
  DialogPrimitiveOverlay,
  DialogPrimitivePortal,
  DialogPrimitiveRoot,
  DialogPrimitiveTitle,
} from '@/components/ui/dialog.primitives';
import { MoreHorizontal } from '@/components/libs/icons';
import { Icon } from '@/components/ui/icon';
import { useUI } from '@/store/ui';
import { ComingSoon } from '@/components/settings/ComingSoon';
import { Link } from '@/components/ui/Link';
import { EXTERNAL_LINKS, routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { MobileInspectorDrawer } from './MobileInspectorDrawer';

interface MobileMoreSheetProps {
  spaceId: string | null;
  docId?: string | null;
}

export const MobileMoreSheet = ({ spaceId, docId }: MobileMoreSheetProps) => {
  const { t } = useTranslation(['chrome', 'common']);
  const open = useUI((s) => s.mobileMoreOpen);
  const setOpen = useUI((s) => s.setMobileMoreOpen);

  return (
    <>
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

          <MenuSection spaceId={spaceId} docId={docId ?? null} />
        </DialogPrimitiveContent>
      </DialogPrimitivePortal>
      </DialogPrimitiveRoot>
      <MobileInspectorDrawer docId={docId ?? null} />
    </>
  );
};

const MenuSection = ({
  spaceId,
  docId,
}: {
  spaceId: string | null;
  docId: string | null;
}) => {
  const { t } = useTranslation(['chrome', 'common']);
  return (
    <div className="px-4 pb-3 pt-4">
      <div className="font-mono text-[9px] uppercase tracking-wider text-ink-4">
        {t('mobileMore.menuLabel')}
      </div>
      <ul className="mt-1 flex flex-col">
        {docId && <InspectorItem />}
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
        <ExternalMoreItem
          href={EXTERNAL_LINKS.githubNewIssue}
          label={t('mobileMore.contact')}
        />
      </ul>
    </div>
  );
};

const InspectorItem = () => {
  const { t } = useTranslation('chrome');
  const setMobileInspectorOpen = useUI((s) => s.setMobileInspectorOpen);
  return (
    <li>
      <DialogPrimitiveClose asChild>
        {/* @lint-ignore native-button: full-width sheet row matching MoreItem's link treatment; not a DS Button kind */}
        <button
          type="button"
          data-testid="mobile-more-inspector"
          onClick={() => { setMobileInspectorOpen(true); }}
          className="flex w-full items-center gap-2 border-b border-rule/60 px-1 py-3 text-left text-[14px] text-ink hover:bg-paper-2"
        >
          <Icon icon={MoreHorizontal} size="sm" className="text-ink-3" />
          {t('topbar.inspector')}
        </button>
      </DialogPrimitiveClose>
    </li>
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

const ExternalMoreItem = ({ href, label }: { href: string; label: string }) => {
  return (
    <li>
      <DialogPrimitiveClose asChild>
        <Link
          href={href}
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
