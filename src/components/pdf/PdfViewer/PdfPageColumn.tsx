import { type ReactNode } from 'react';
import { PdfPageView } from './PdfPageView';

interface PdfPageColumnProps {
  numPages: number;
  scale: number;
  pageOverlay?: (page: number) => ReactNode;
  onPageElement?: (page: number, el: HTMLElement | null) => void;
}

/**
 * The continuous page column: every page mounted top-to-bottom in one scroll
 * flow, so reading is a scroll rather than a page-at-a-time flip. Each page keeps
 * its own wrapper (`data-page-number`), text layer and overlay slot, so the
 * highlight layer projects per page and the scroll-sync observer can read which
 * page is in view. Composed from {@link PdfPageView} so a single page stays the
 * one unit that owns page geometry.
 */
export const PdfPageColumn = ({
  numPages,
  scale,
  pageOverlay,
  onPageElement,
}: PdfPageColumnProps) => (
  <div data-testid="pdf-page-column" className="flex flex-col items-center gap-4">
    {Array.from({ length: numPages }, (_, i) => i + 1).map((page) => (
      <PdfPageView
        key={page}
        page={page}
        numPages={numPages}
        scale={scale}
        pageOverlay={pageOverlay}
        onPageElement={onPageElement}
      />
    ))}
  </div>
);
