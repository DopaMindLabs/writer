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
import { SpaceRail } from './SpaceRail';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';

interface MobileNavDrawerProps {
  spaceId: string;
  activeDocId: string | null;
}

export const MobileNavDrawer = ({ spaceId, activeDocId }: MobileNavDrawerProps) => {
  const { t } = useTranslation('chrome');
  const mobileNavOpen = useUI((s) => s.mobileNavOpen);
  const setMobileNavOpen = useUI((s) => s.setMobileNavOpen);
  const location = useLocation();

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname, setMobileNavOpen]);

  return (
    <DialogPrimitiveRoot open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
      <DialogPrimitivePortal>
        <DialogPrimitiveOverlay
          className={cn(
            'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          )}
        />
        <DialogPrimitiveContent
          aria-describedby={undefined}
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex w-[min(320px,85vw)] bg-paper-2 shadow-lg md:hidden',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left',
            'duration-200',
          )}
        >
          <DialogPrimitiveTitle className="sr-only">{t('mobileNav.title')}</DialogPrimitiveTitle>
          <SpaceRail activeSpaceId={spaceId} />
          <Sidebar
            spaceId={spaceId}
            activeDocId={activeDocId}
            className="w-auto flex-1 border-r-0"
          />
        </DialogPrimitiveContent>
      </DialogPrimitivePortal>
    </DialogPrimitiveRoot>
  );
};
