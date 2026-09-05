import type { ReactNode } from 'react';
import { Eyebrow } from '@/components/ui/Eyebrow';

export const MenuGroup = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <div className="mb-3 last:mb-0">
    <Eyebrow size={9} tone="ink4">
      {label}
    </Eyebrow>
    <ul className="mt-1 flex flex-col">{children}</ul>
  </div>
);
