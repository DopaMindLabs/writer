import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from '@/components/libs/variants';
import { cn } from '@/lib/utils';
import { X } from '@/components/libs/icons';
import { Icon } from './icon';
import { STATUS_ICON, type StatusKind } from './statusRole';

const inlineBannerRecipe = cva(
  'flex items-start gap-3 border-l-[3px] px-4 py-3',
  {
    variants: {
      kind: {
        error: 'border-danger bg-danger-bg text-danger',
        warning: 'border-warning bg-warning-bg text-warning',
        success: 'border-success bg-success-bg text-success',
        info: 'border-info bg-info-bg text-info',
      },
    },
    defaultVariants: { kind: 'info' },
  },
);

export interface InlineBannerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title'>,
    VariantProps<typeof inlineBannerRecipe> {
  kind?: StatusKind;
  title?: ReactNode;
  action?: string;
  onAction?: () => void;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export const InlineBanner = forwardRef<HTMLDivElement, InlineBannerProps>(
  (
    {
      kind = 'info',
      title,
      action,
      onAction,
      dismissible = false,
      onDismiss,
      className,
      children,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      role="status"
      className={cn(inlineBannerRecipe({ kind }), className)}
      {...props}
    >
      <Icon icon={STATUS_ICON[kind]} size="sm" className="mt-0.5 shrink-0" />
      <div className="flex-1">
        {title ? (
          <p className="font-sans text-[13px] font-semibold text-ink">{title}</p>
        ) : null}
        {children ? (
          <div className="font-serif text-[13px] leading-relaxed text-ink-2">
            {children}
          </div>
        ) : null}
        {action ? (
          <button
            type="button"
            onClick={onAction}
            className="mt-1 font-sans text-[12px] font-medium text-ink underline underline-offset-2"
          >
            {action}
          </button>
        ) : null}
      </div>
      {dismissible ? (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="shrink-0 text-ink-3 hover:text-ink"
        >
          <Icon icon={X} size="xs" />
        </button>
      ) : null}
    </div>
  ),
);
InlineBanner.displayName = 'InlineBanner';
