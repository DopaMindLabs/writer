import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  DialogPrimitiveContent,
  DialogPrimitiveOverlay,
  DialogPrimitivePortal,
  DialogPrimitiveRoot,
  DialogPrimitiveTitle,
} from '@/components/ui/dialog.primitives';
import { useUI } from '@/store/ui';
import { useDocument } from '@/hooks/useDocuments';
import { DocInspector } from './DocInspector';
import { cn } from '@/lib/utils';

interface MobileInspectorDrawerProps {
  docId: string | null;
}

/**
 * Presents the DocInspector as a right-hand drawer on small screens, where
 * the inline inspector panel and its topbar toggle are hidden. Opened from
 * the mobile more sheet; closes on overlay tap, Escape, or navigation.
 */
export const MobileInspectorDrawer = ({ docId }: MobileInspectorDrawerProps) => {
  const { t } = useTranslation('chrome');
  const open = useUI((s) => s.mobileInspectorOpen);
  const setOpen = useUI((s) => s.setMobileInspectorOpen);
  const doc = useDocument(docId);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, setOpen]);

  if (!doc) return null;

  return (
    <DialogPrimitiveRoot open={open} onOpenChange={setOpen}>
      <DialogPrimitivePortal>
        <DialogPrimitiveOverlay
          className={cn(
            'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          )}
        />
        <DialogPrimitiveContent
          aria-describedby={undefined}
          data-testid="mobile-inspector-drawer"
          className={cn(
            'fixed inset-y-0 right-0 z-50 flex w-[min(320px,85vw)] bg-paper-2 shadow-lg md:hidden',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
            'duration-200',
          )}
        >
          <DialogPrimitiveTitle className="sr-only">
            {t('topbar.inspector')}
          </DialogPrimitiveTitle>
          <DocInspector
            docName={doc.name}
            docId={doc.id}
            className="flex w-full border-l-0"
          />
        </DialogPrimitiveContent>
      </DialogPrimitivePortal>
    </DialogPrimitiveRoot>
  );
};
