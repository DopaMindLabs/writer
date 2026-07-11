import type { ReactNode } from 'react';

interface SectionLabelProps {
  children: ReactNode;
  testId?: string;
}

/**
 * The uppercase-mono group heading in Quick Settings ("APPEARANCE", "WRITING",
 * "MORE"). Transitional local copy — replaced by the shared `ui/SectionLabel`
 * once the folder is composed from primitives.
 */
export const SectionLabel = ({ children, testId }: SectionLabelProps) => (
  <div
    data-testid={testId}
    className="px-4 pb-1.5 pt-2.5 font-mono text-[9px] uppercase tracking-wider text-ink-4"
  >
    {children}
  </div>
);
