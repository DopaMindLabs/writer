import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ComingSoonBadge } from './ComingSoonBadge';
import { cn } from '@/lib/utils';

export interface ComingSoonProps {
  children: ReactNode;
  hint?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  className?: string;
  showBadge?: boolean;
  badgeClassName?: string;
  asChild?: boolean;
  overlay?: boolean;
}

export const ComingSoon = ({
  children,
  hint,
  side = 'top',
  align = 'center',
  className,
  showBadge = false,
  badgeClassName,
  overlay = false,
}: ComingSoonProps) => {
  const { t } = useTranslation('common');
  const tooltipText = hint
    ? `${t('comingSoon.tooltip')} — ${hint}`
    : t('comingSoon.tooltip');

  if (overlay) {
    return (
      <div
        data-coming-soon="true"
        data-coming-soon-overlay="true"
        aria-disabled="true"
        className={cn(
          'relative block w-full cursor-not-allowed',
          className,
        )}
      >
        <div className="pointer-events-none opacity-50">{children}</div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center bg-paper/40 backdrop-blur-[1px]"
        >
          <ComingSoonBadge
            className={cn('px-2 py-1 text-[10px]', badgeClassName)}
          />
        </div>
        <span className="sr-only">{tooltipText}</span>
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          data-coming-soon="true"
          aria-disabled="true"
          tabIndex={0}
          className={cn(
            'relative inline-flex max-w-full cursor-not-allowed items-center align-middle outline-none focus-visible:ring-1 focus-visible:ring-ink',
            className,
          )}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none inline-flex max-w-full items-center opacity-60"
          >
            {children}
          </span>
          {showBadge && (
            <ComingSoonBadge
              className={cn('absolute right-1 top-1', badgeClassName)}
            />
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent side={side} align={align} className="max-w-xs">
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  );
};
