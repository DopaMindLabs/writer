import type { ReactNode } from 'react';
import { SectionLabel as UISectionLabel } from '@/components/ui/SectionLabel';

interface SectionLabelProps {
  children: ReactNode;
  testId?: string;
}

/**
 * The uppercase-mono group heading in Quick Settings ("APPEARANCE", "WRITING",
 * "MORE"). A thin adapter over the shared `ui/SectionLabel` that adds the
 * popover's row padding — so the mono label voice comes from one recipe, not a
 * hand-rolled class string.
 */
export const SectionLabel = ({ children, testId }: SectionLabelProps) => (
  <UISectionLabel
    size={9}
    tone="ink4"
    data-testid={testId}
    className="px-4 pb-1.5 pt-2.5"
  >
    {children}
  </UISectionLabel>
);
