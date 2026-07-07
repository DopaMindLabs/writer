import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ContextMenu, ContextMenuTrigger, ContextMenuContent } from '@/components/ui/context-menu';
import { PdfMarkMenuContent } from './PdfMarkMenuContent';
import { PdfMarkNoteEditor } from './PdfMarkNoteEditor';
import { swatchRecipe, type StripColor } from '@/pdf-annotator';
import { HL_COLORS, type HighlightColor } from '@/theme/tokens';
import type { PdfAnnotation } from '@/db/schema';
import type { PdfAnnotator } from '@/hooks/usePdfAnnotator';

const COLOR_IDS = Object.keys(HL_COLORS) as HighlightColor[];

const markFromEvent = (target: EventTarget | null): string | null => {
  const el = target instanceof HTMLElement ? target.closest('[data-highlight-id]') : null;
  return el?.getAttribute('data-highlight-id') ?? null;
};

interface PdfMarkContextMenuProps {
  annotations: PdfAnnotation[];
  annotator: PdfAnnotator;
  children: ReactNode;
}

/**
 * The secondary, power-user path for managing existing marks: right-click (or
 * the menu key) on a mark opens a menu to recolour it, add/edit its note, or
 * remove it. Right-clicking empty ground is left to the browser — the capture
 * guard stops the menu only when the target is not a mark. The one note-editing
 * surface (reused from the strip) opens anchored over the mark.
 */
export const PdfMarkContextMenu = ({
  annotations,
  annotator,
  children,
}: PdfMarkContextMenuProps) => {
  const { t } = useTranslation('screens');
  const [active, setActive] = useState<PdfAnnotation | null>(null);
  const [noteMark, setNoteMark] = useState<PdfAnnotation | null>(null);

  const guard = (event: React.MouseEvent): void => {
    const id = markFromEvent(event.target);
    if (!id) {
      event.stopPropagation();
      return;
    }
    setActive(annotations.find((a) => a.id === id) ?? null);
  };

  const colors: StripColor[] = COLOR_IDS.map((id) => ({
    id,
    swatchClassName: swatchRecipe({ color: id }),
    label: t(`pdfHighlight.colors.${id}`),
  }));

  return (
    <>
      <div className="contents" onContextMenuCapture={guard}>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div className="contents">{children}</div>
          </ContextMenuTrigger>
          <ContextMenuContent data-testid="pdf-mark-menu">
            {active ? (
              <PdfMarkMenuContent
                mark={active}
                colors={colors}
                annotator={annotator}
                onEditNote={() => {
                  setNoteMark(active);
                }}
              />
            ) : null}
          </ContextMenuContent>
        </ContextMenu>
      </div>
      {noteMark ? (
        <PdfMarkNoteEditor
          mark={noteMark}
          onSave={(note) => {
            void annotator.setNote(noteMark.id, note);
            setNoteMark(null);
          }}
          onCancel={() => {
            setNoteMark(null);
          }}
        />
      ) : null}
    </>
  );
};
