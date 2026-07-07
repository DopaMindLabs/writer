import { useTranslation } from 'react-i18next';
import { ContextMenuRadioGroup } from '@/components/ui/context-menu';
import {
  ContextMenuItem,
  ContextMenuRadioItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import type { PdfAnnotation } from '@/db/schema';
import type { HighlightColor } from '@/theme/tokens';
import type { StripColor } from '@/pdf-annotator';
import type { PdfAnnotator } from '@/hooks/usePdfAnnotator';

export interface PdfMarkMenuContentProps {
  mark: PdfAnnotation;
  colors: StripColor[];
  annotator: PdfAnnotator;
  onEditNote: () => void;
}

/**
 * The context-menu items for one existing mark: a colour radio group, an
 * add/edit-note action, and a destructive remove. Rendered inside the menu's
 * always-mounted `ContextMenuContent` so Radix can portal it on open.
 */
export const PdfMarkMenuContent = ({
  mark,
  colors,
  annotator,
  onEditNote,
}: PdfMarkMenuContentProps) => {
  const { t } = useTranslation('screens');
  const kind = t(`pdfMarkMenu.kinds.${mark.kind}`);

  return (
    <>
      <ContextMenuRadioGroup
        value={mark.color}
        onValueChange={(color) => {
          void annotator.recolor(mark.id, color as HighlightColor);
        }}
      >
        {colors.map((color) => (
          <ContextMenuRadioItem
            key={color.id}
            value={color.id}
            data-testid={`mark-color-${color.id}`}
          >
            <span aria-hidden="true" className={`h-3.5 w-3.5 rounded-full ${color.swatchClassName}`} />
            {color.label}
          </ContextMenuRadioItem>
        ))}
      </ContextMenuRadioGroup>
      <ContextMenuSeparator />
      <ContextMenuItem data-testid="mark-edit-note" onSelect={onEditNote}>
        {mark.note ? t('pdfMarkMenu.editNote') : t('pdfMarkMenu.addNote')}
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        data-testid="mark-remove"
        className="text-danger focus:text-danger"
        onSelect={() => {
          void annotator.remove(mark.id);
        }}
      >
        ✕ {t('pdfMarkMenu.remove', { kind })}
      </ContextMenuItem>
    </>
  );
};
