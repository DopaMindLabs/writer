import type { ReactNode } from 'react';
import { SectionLabel } from '@/components/ui/SectionLabel';

export const MenuGroup = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <div className="mb-3 last:mb-0">
    <SectionLabel size={9} tone="ink4">
      {label}
    </SectionLabel>
    <ul className="mt-1 flex flex-col">{children}</ul>
  </div>
);
