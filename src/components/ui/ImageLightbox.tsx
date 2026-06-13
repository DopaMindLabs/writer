import { useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  X,
} from '@/components/libs/icons';
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
import { useLightboxContainer } from '@/components/ui/LightboxContainerContext';
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

type LightboxMode = 'fullscreen' | 'contained' | 'expanded';

const decideMode = (
  container: HTMLElement | null,
  expanded: boolean,
): LightboxMode => {
  if (!container) return 'fullscreen';
  if (expanded) return 'expanded';
  return 'contained';
};

const isContained = (mode: LightboxMode): boolean => mode === 'contained';

const overlayClass = (mode: LightboxMode): string =>
  cn(
    'z-50 bg-black/60',
    'data-[state=open]:animate-in data-[state=closed]:animate-out',
    'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
    isContained(mode) ? 'absolute inset-0' : 'fixed inset-0',
  );

const contentClass = (mode: LightboxMode): string =>
  cn(
    'z-50 flex flex-col border border-rule bg-paper p-2 shadow-xl',
    'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
    'data-[state=open]:animate-in data-[state=closed]:animate-out',
    'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
    isContained(mode)
      ? 'absolute max-h-[calc(100%-1rem)] max-w-[calc(100%-1rem)]'
      : 'fixed max-h-[90vh] max-w-[92vw]',
  );

const stageImageClass = (mode: LightboxMode): string =>
  cn(
    'object-contain',
    isContained(mode) ? 'max-h-full max-w-full' : 'max-h-[80vh] max-w-[88vw]',
  );

interface HeaderToggleProps {
  mode: LightboxMode;
  onToggle: () => void;
}

const HeaderToggle = ({ mode, onToggle }: HeaderToggleProps) => {
  if (mode === 'fullscreen') return null;
  const isExpanded = mode === 'expanded';
  return (
    <IconButton
      icon={isExpanded ? Minimize2 : Maximize2}
      label={isExpanded ? 'Restore image to pane' : 'Expand image to full screen'}
      buttonSize="sm"
      iconSize="sm"
      onClick={onToggle}
      data-testid={isExpanded ? 'image-lightbox-shrink' : 'image-lightbox-expand'}
      className="text-ink-4"
    />
  );
};

interface LightboxHeaderProps {
  name: string | undefined;
  mode: LightboxMode;
  onToggle: () => void;
  onClose: () => void;
}

const LightboxHeader = ({
  name,
  mode,
  onToggle,
  onClose,
}: LightboxHeaderProps) => (
  <div className="flex items-center justify-between gap-2 pb-1.5">
    <span className="min-w-0 truncate font-mono text-[10px] uppercase tracking-wider text-ink-3">
      {name}
    </span>
    <div className="flex items-center gap-1">
      <HeaderToggle mode={mode} onToggle={onToggle} />
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
  </div>
);

interface LightboxStageProps {
  url: string | null;
  name: string | undefined;
  mode: LightboxMode;
  canPage: boolean;
  onPage: (delta: number) => void;
}

const LightboxStage = ({
  url,
  name,
  mode,
  canPage,
  onPage,
}: LightboxStageProps) => (
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
        className={stageImageClass(mode)}
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

const useResetExpandedOnClose = (
  open: boolean,
  setExpanded: (v: boolean) => void,
): void => {
  useEffect(() => {
    if (!open) setExpanded(false);
  }, [open, setExpanded]);
};

interface LightboxBodyProps {
  current: LightboxImage | undefined;
  url: string | null;
  index: number;
  count: number;
  canPage: boolean;
  mode: LightboxMode;
  onPage: (delta: number) => void;
  onToggle: () => void;
  onClose: () => void;
}

const LightboxBody = ({
  current,
  url,
  index,
  count,
  canPage,
  mode,
  onPage,
  onToggle,
  onClose,
}: LightboxBodyProps) => (
  <DialogPrimitiveContent
    data-testid="image-lightbox"
    data-mode={mode}
    className={contentClass(mode)}
  >
    <DialogPrimitiveTitle className="sr-only">
      {current?.name ?? 'Image'}
    </DialogPrimitiveTitle>
    <DialogPrimitiveDescription className="sr-only">
      Full-size image preview.
    </DialogPrimitiveDescription>
    <LightboxHeader
      name={current?.name}
      mode={mode}
      onToggle={onToggle}
      onClose={onClose}
    />
    <LightboxStage
      url={url}
      name={current?.name}
      mode={mode}
      canPage={canPage}
      onPage={onPage}
    />
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
);

export const ImageLightbox = ({
  images,
  index,
  open,
  onOpenChange,
  onIndexChange,
}: ImageLightboxProps) => {
  const container = useLightboxContainer();
  const [expanded, setExpanded] = useState(false);
  useResetExpandedOnClose(open, setExpanded);

  const current = images.at(index);
  const url = useObjectUrl(current?.blob ?? null);
  const count = images.length;
  const canPage = count > 1 && Boolean(onIndexChange);
  const mode = decideMode(container, expanded);
  const portalContainer = isContained(mode) ? container : undefined;

  const go = useCallback(
    (delta: number) => {
      if (!onIndexChange || count === 0) return;
      onIndexChange((index + delta + count) % count);
    },
    [onIndexChange, count, index],
  );

  useArrowKeyPaging(open && canPage, go);

  return (
    <DialogPrimitiveRoot
      open={open}
      onOpenChange={onOpenChange}
      modal={!isContained(mode)}
    >
      <DialogPrimitivePortal container={portalContainer}>
        <DialogPrimitiveOverlay className={overlayClass(mode)} />
        <LightboxBody
          current={current}
          url={url}
          index={index}
          count={count}
          canPage={canPage}
          mode={mode}
          onPage={go}
          onToggle={() => { setExpanded((v) => !v); }}
          onClose={() => { onOpenChange(false); }}
        />
      </DialogPrimitivePortal>
    </DialogPrimitiveRoot>
  );
};
