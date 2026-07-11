import { useTranslation } from 'react-i18next';
import {
  DialogPrimitiveContent,
  DialogPrimitiveOverlay,
  DialogPrimitivePortal,
  DialogPrimitiveRoot,
  DialogPrimitiveTitle,
} from '@/components/ui/dialog.primitives';
import { useUI } from '@/store/ui';
import { cn } from '@/lib/utils';
import { MobileInspectorDrawer } from '@/components/chrome/MobileInspectorDrawer';
import { MenuSection } from './MenuSection';

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
