import { useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from '@/components/libs/icons';
import {
  DialogPrimitiveContent,
  DialogPrimitiveDescription,
  DialogPrimitiveOverlay,
  DialogPrimitivePortal,
  DialogPrimitiveRoot,
  DialogPrimitiveTitle,
} from '@/components/ui/dialog.primitives';
import { IconButton } from '@/components/ui/icon';
import { useObjectUrl } from '@/hooks/useObjectUrl';
import { cn } from '@/lib/utils';

export interface LightboxImage {
  blob: Blob;
  name: string;
}

export interface ImageLightboxProps {
  images: readonly LightboxImage[];
  index: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIndexChange?: (index: number) => void;
}

const LightboxHeader = ({
  name,
  onClose,
}: {
  name: string | undefined;
  onClose: () => void;
}) => (
  <div className="flex items-center justify-between gap-2 pb-1.5">
    <span className="min-w-0 truncate font-mono text-[10px] uppercase tracking-wider text-ink-3">
      {name}
    </span>
    <IconButton
      icon={X}
      label="Close image"
      buttonSize="sm"
      iconSize="sm"
      onClick={onClose}
      data-testid="image-lightbox-close"
      className="text-ink-4"
    />
  </div>
);

const LightboxStage = ({
  url,
  name,
  canPage,
  onPage,
}: {
  url: string | null;
  name: string | undefined;
  canPage: boolean;
  onPage: (delta: number) => void;
}) => (
  <div className="relative flex min-h-0 flex-1 items-center justify-center">
    {canPage && (
      <IconButton
        icon={ChevronLeft}
        label="Previous image"
        onClick={() => { onPage(-1); }}
        data-testid="image-lightbox-prev"
        className="absolute left-1 z-10 bg-paper/80 text-ink-3 hover:bg-paper hover:text-ink"
      />
    )}
    {url ? (
      <img
        src={url}
        alt={name ?? ''}
        data-testid="image-lightbox-image"
        className="max-h-[80vh] max-w-[88vw] object-contain"
      />
    ) : null}
    {canPage && (
      <IconButton
        icon={ChevronRight}
        label="Next image"
        onClick={() => { onPage(1); }}
        data-testid="image-lightbox-next"
        className="absolute right-1 z-10 bg-paper/80 text-ink-3 hover:bg-paper hover:text-ink"
      />
    )}
  </div>
);

const useArrowKeyPaging = (
  enabled: boolean,
  onPage: (delta: number) => void,
) => {
  useEffect(() => {
    if (!enabled) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') onPage(-1);
      if (e.key === 'ArrowRight') onPage(1);
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); };
  }, [enabled, onPage]);
};

export const ImageLightbox = ({
  images,
  index,
  open,
  onOpenChange,
  onIndexChange,
}: ImageLightboxProps) => {
  const current = images.at(index);
  const url = useObjectUrl(current?.blob ?? null);
  const count = images.length;
  const canPage = count > 1 && Boolean(onIndexChange);

  const go = useCallback(
    (delta: number) => {
      if (!onIndexChange || count === 0) return;
      onIndexChange((index + delta + count) % count);
    },
    [onIndexChange, count, index],
  );

  useArrowKeyPaging(open && canPage, go);

  return (
    <DialogPrimitiveRoot open={open} onOpenChange={onOpenChange}>
      <DialogPrimitivePortal>
        <DialogPrimitiveOverlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitiveContent
          data-testid="image-lightbox"
          className={cn(
            'fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 flex-col border border-rule bg-paper p-2 shadow-xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          )}
        >
          <DialogPrimitiveTitle className="sr-only">
            {current?.name ?? 'Image'}
          </DialogPrimitiveTitle>
          <DialogPrimitiveDescription className="sr-only">
            Full-size image preview.
          </DialogPrimitiveDescription>

          <LightboxHeader name={current?.name} onClose={() => { onOpenChange(false); }} />
          <LightboxStage url={url} name={current?.name} canPage={canPage} onPage={go} />

          {count > 1 && (
            <div
              data-testid="image-lightbox-counter"
              aria-live="polite"
              className="pt-1 text-center font-mono text-[10px] text-ink-4"
            >
              {index + 1} / {count}
            </div>
          )}
        </DialogPrimitiveContent>
      </DialogPrimitivePortal>
    </DialogPrimitiveRoot>
  );
};
