import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/icon';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Pilcrow, Info } from '@/components/libs/icons';
import { cn } from '@/lib/utils';
import type { PdfReaderPanel } from '@/store/ui';
import type { PdfAnnotation } from '@/db/schema';
import { PdfRailTicks } from './PdfRailTicks';

interface PdfReaderRailProps {
  panel: PdfReaderPanel;
  annotations: PdfAnnotation[];
  numPages: number;
  onPanelChange: (panel: PdfReaderPanel) => void;
  onNavigateToPage: (page: number) => void;
  overflowSlot: ReactNode;
}

// No ⟲ history glyph: the design draws one, but the app has no pdf history to
// open — it ships with the feature, never as a dead button.
const GLYPHS = [
  { key: 'highlights', icon: Pilcrow, testId: 'pdf-rail-highlights' },
  { key: 'info', icon: Info, testId: 'pdf-rail-info' },
] as const;

/**
 * The 44px reader rail: one lit glyph per side panel, a highlight count badge on
 * the ¶ glyph, the overflow at the foot, and — while no panel is open — highlight
 * ticks down its left hairline.
 */
export const PdfReaderRail = ({
  panel,
  annotations,
  numPages,
  onPanelChange,
  onNavigateToPage,
  overflowSlot,
}: PdfReaderRailProps) => {
  const { t } = useTranslation('screens');
  const label = { highlights: t('pdfHighlights.title'), info: t('pdfReader.info') };

  return (
    <div
      data-testid="pdf-reader-rail"
      className="relative flex w-11 flex-col border-l border-rule bg-paper"
    >
      {panel === null && (
        <PdfRailTicks
          annotations={annotations}
          numPages={numPages}
          onNavigateToPage={onNavigateToPage}
        />
      )}
      <div className="relative z-10 flex flex-1 flex-col items-center gap-1 py-2">
        {GLYPHS.map((glyph) => {
          const active = panel === glyph.key;
          return (
            <button
              key={glyph.key}
              type="button"
              data-testid={glyph.testId}
              aria-label={label[glyph.key]}
              aria-pressed={active}
              onClick={() => {
                onPanelChange(active ? null : glyph.key);
              }}
              className={cn(
                'relative flex h-8 w-8 items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink',
                active ? 'bg-ink text-paper' : 'text-ink-3 hover:text-ink',
              )}
            >
              <Icon icon={glyph.icon} size="sm" />
              {glyph.key === 'highlights' && annotations.length > 0 && (
                <Eyebrow
                  size={9}
                  tone={active ? 'paper' : 'ink3'}
                  data-testid="pdf-rail-highlights-count"
                  className="absolute right-0.5 top-0.5"
                >
                  {annotations.length}
                </Eyebrow>
              )}
            </button>
          );
        })}
        <div className="mt-auto">{overflowSlot}</div>
      </div>
    </div>
  );
};
