import type { ReactNode } from 'react';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { TypographyP } from '@/components/ui/typography';

interface PdfReaderPanelProps {
  title: string;
  /** Shown as a mono count in the head when defined (e.g. the highlight total). */
  count?: number;
  footerSlot?: ReactNode;
  children: ReactNode;
}

/**
 * The reader's side-panel shell: a titled head with an optional count, a
 * scrolling body, and a footer slot. It owns the chrome only — the caller
 * chooses the body (the highlights list or the info rows).
 */
export const PdfReaderPanel = ({
  title,
  count,
  footerSlot,
  children,
}: PdfReaderPanelProps) => {
  return (
    <aside
      data-testid="pdf-reader-panel"
      aria-label={title}
      className="flex w-[286px] flex-col border-l border-rule bg-paper"
    >
      <div className="flex h-12 items-center justify-between border-b border-rule px-5">
        <TypographyP variant="caption" className="not-italic font-medium text-ink">
          {title}
        </TypographyP>
        {count !== undefined && <Eyebrow>{count}</Eyebrow>}
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
      {footerSlot}
    </aside>
  );
};
