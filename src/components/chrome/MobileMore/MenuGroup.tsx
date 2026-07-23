import type { ReactNode } from 'react';

export const MenuGroup = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <div className="mb-3 last:mb-0">
    <div className="font-mono text-[9px] uppercase tracking-wider text-ink-4">
      {label}
    </div>
    <ul className="mt-1 flex flex-col">{children}</ul>
  </div>
);
