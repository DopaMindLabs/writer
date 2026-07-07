import { useTranslation } from 'react-i18next';
import { SelectionStripNoteEditor, swatchRecipe } from '@/pdf-annotator';
import type { PdfAnnotation } from '@/db/schema';

const CHASSIS = 'absolute z-50 rounded-sm border border-rule bg-paper shadow-md';

const pct = (n: number): string => `${(n * 100).toString()}%`;

interface PdfMarkNoteEditorProps {
  mark: PdfAnnotation;
  onSave: (note: string) => void;
  onCancel: () => void;
}

/**
 * The single note-editing surface, reused from the strip and anchored over a
 * mark's union box (percentages of the page wrapper, so no page-element handle
 * is needed). Prefills the existing note; an empty save clears it (facade
 * semantics).
 */
export const PdfMarkNoteEditor = ({ mark, onSave, onCancel }: PdfMarkNoteEditorProps) => {
  const { t } = useTranslation('screens');
  const left = Math.min(...mark.rects.map((r) => r.x));
  const top = Math.min(...mark.rects.map((r) => r.y));

  return (
    <div
      className={CHASSIS}
      style={{ left: pct(left), top: pct(top) }}
      data-testid="pdf-mark-note-editor"
    >
      <SelectionStripNoteEditor
        colorSwatchClassName={swatchRecipe({ color: mark.color })}
        eyebrow={t('pdfStrip.noteEyebrow', { page: mark.page })}
        placeholder={t('pdfStrip.notePlaceholder')}
        cancelHint={t('pdfStrip.noteCancelHint')}
        saveHint={t('pdfStrip.noteSaveHint')}
        initialValue={mark.note ?? ''}
        onSave={onSave}
        onCancel={onCancel}
      />
    </div>
  );
};
