import { useEffect, useRef } from 'react';
import { useObjectUrl } from '@/hooks/useObjectUrl';
import { cn } from '@/lib/utils';

interface NotebookPageThumbnailProps {
  readonly blob: Blob;
  readonly pageNumber: number;
  readonly selected: boolean;
  readonly focusWhenSelected?: boolean;
  readonly onSelect: () => void;
}

export const NotebookPageThumbnail = ({
  blob,
  pageNumber,
  selected,
  focusWhenSelected = false,
  onSelect,
}: NotebookPageThumbnailProps) => {
  const url = useObjectUrl(blob);
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!selected || !ref.current) return;
    ref.current.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (focusWhenSelected) ref.current.focus();
  }, [focusWhenSelected, selected]);

  return (
    <button
      ref={ref}
      type="button"
      aria-label={`Page ${String(pageNumber)}`}
      aria-current={selected ? 'page' : undefined}
      onClick={onSelect}
      className={cn(
        'relative h-24 w-16 shrink-0 border bg-paper p-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink',
        selected ? 'border-ink' : 'border-rule hover:border-ink-3',
      )}
    >
      {url ? <img src={url} alt="" aria-hidden className="h-full w-full object-contain" /> : null}
      <span className="absolute bottom-1 right-1 bg-paper/90 px-1 font-mono text-[9px] text-ink-3">
        {pageNumber}
      </span>
    </button>
  );
};
