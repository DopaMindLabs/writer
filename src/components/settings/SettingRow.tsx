import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SettingRowProps {
  label: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
  children: ReactNode;
}

export function SettingRow({ label, hint, disabled, children }: SettingRowProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 border-b border-rule/60 py-[18px] md:grid md:grid-cols-[200px_1fr] md:items-start md:gap-6',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <div>
        <div className="text-[13px] font-medium text-ink">{label}</div>
        {hint ? (
          <div className="mt-1 font-serif text-[12px] italic text-ink-3">
            {hint}
          </div>
        ) : null}
      </div>
      <div>{children}</div>
    </div>
  );
}
