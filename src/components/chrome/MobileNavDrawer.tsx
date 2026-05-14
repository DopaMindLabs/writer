import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useUI } from '@/store/ui';
import { SpaceRail } from './SpaceRail';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';

interface MobileNavDrawerProps {
  spaceId: string;
  activeDocId: string | null;
}

export function MobileNavDrawer({ spaceId, activeDocId }: MobileNavDrawerProps) {
  const mobileNavOpen = useUI((s) => s.mobileNavOpen);
  const setMobileNavOpen = useUI((s) => s.setMobileNavOpen);
  const location = useLocation();

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname, setMobileNavOpen]);

  return (
    <DialogPrimitive.Root open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          )}
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex w-[min(320px,85vw)] bg-paper-2 shadow-lg md:hidden',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left',
            'duration-200',
          )}
        >
          <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
          <SpaceRail activeSpaceId={spaceId} />
          <Sidebar spaceId={spaceId} activeDocId={activeDocId} />
          <DialogPrimitive.Close
            className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-3 hover:bg-paper hover:text-ink"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
