import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SettingRowProps {
  label: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
  children: ReactNode;
  'data-testid'?: string;
}

export const SettingRow = ({
  label,
  hint,
  disabled,
  children,
  'data-testid': testId,
}: SettingRowProps) => {
  return (
    <div
      data-testid={testId}
      className={cn(
        'flex flex-col gap-2 border-b border-rule/60 py-4 md:grid md:grid-cols-[1fr_auto] md:items-center md:gap-8',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <div>
        <div
          data-testid={testId ? `${testId}-label` : undefined}
          className="text-[14px] font-medium text-ink"
        >
          {label}
        </div>
        {hint ? (
          <div
            data-testid={testId ? `${testId}-hint` : undefined}
            className="mt-1 max-w-[520px] font-serif text-[13px] italic text-ink-3"
          >
            {hint}
          </div>
        ) : null}
      </div>
      <div>{children}</div>
    </div>
  );
};
