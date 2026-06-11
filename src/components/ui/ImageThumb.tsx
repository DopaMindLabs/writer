import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from '@/components/libs/variants';
import { cn } from '@/lib/utils';
import { X } from '@/components/libs/icons';
import { useObjectUrl } from '@/hooks/useObjectUrl';
import { IconButton } from './icon';

const imageThumbRecipe = cva(
  'group/thumb relative inline-flex shrink-0 overflow-hidden border border-rule bg-paper-2',
  {
    variants: {
      size: {
        sm: 'h-12 w-12',
        md: 'h-20 w-20',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export interface ImageThumbProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children'>,
    VariantProps<typeof imageThumbRecipe> {
  blob: Blob;
  name: string;
  onRemove?: () => void;
  removeTestId?: string;
  onOpen?: () => void;
  openTestId?: string;
}

export const ImageThumb = forwardRef<HTMLDivElement, ImageThumbProps>(
  (
    { blob, name, size, onRemove, removeTestId, onOpen, openTestId, className, ...props },
    ref,
  ) => {
    const url = useObjectUrl(blob);
    return (
      <div ref={ref} className={cn(imageThumbRecipe({ size }), className)} {...props}>
        {url && onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            aria-label={`View ${name}`}
            data-testid={openTestId}
            className="h-full w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink"
          >
            <img src={url} alt={name} className="h-full w-full object-cover" />
          </button>
        ) : url ? (
          <img src={url} alt={name} className="h-full w-full object-cover" />
        ) : null}
        {onRemove ? (
          <IconButton
            icon={X}
            label={`Remove ${name}`}
            buttonSize="sm"
            iconSize="xs"
            onClick={onRemove}
            data-testid={removeTestId}
            className="absolute right-0 top-0 h-5 w-5 rounded-none bg-paper/80 text-ink-3 opacity-0 hover:bg-paper hover:text-ink group-hover/thumb:opacity-100 focus-visible:opacity-100"
          />
        ) : null}
      </div>
    );
  },
);
ImageThumb.displayName = 'ImageThumb';
