import { useTranslation } from 'react-i18next';
import {
  SelectionStrip,
  swatchRecipe,
  type StripColor,
  type SelectionStripLabels,
  type PdfSelectionCapture,
} from '@/pdf-annotator';
import { HL_COLORS, type HighlightColor } from '@/theme/tokens';
import type { PdfAnnotator } from '@/hooks/usePdfAnnotator';

const COLOR_IDS = Object.keys(HL_COLORS) as HighlightColor[];

interface PdfSelectionStripProps {
  capture: PdfSelectionCapture;
  pageEl: HTMLElement;
  annotator: PdfAnnotator;
}

/**
 * The app wrapper for the module's selection strip: builds the colour roster
 * from the `hl-*` palette and the swatch recipe, the labels from i18n, and wires
 * every action to the annotator facades. `cite` is deliberately absent — the
 * citations feature exposes no programmatic prefilled entry point, so no dead
 * button ships (see the PE.4 note in the runbook).
 */
export const PdfSelectionStrip = ({ capture, pageEl, annotator }: PdfSelectionStripProps) => {
  const { t } = useTranslation('screens');

  const colors: StripColor[] = COLOR_IDS.map((id) => ({
    id,
    swatchClassName: swatchRecipe({ color: id }),
    label: t(`pdfHighlight.colors.${id}`),
  }));

  const labels: SelectionStripLabels = {
    toolbar: t('pdfStrip.toolbar'),
    underline: t('pdfStrip.underline'),
    strikethrough: t('pdfStrip.strikethrough'),
    note: t('pdfStrip.note'),
    cite: t('pdfStrip.cite'),
    noteEyebrow: t('pdfStrip.noteEyebrow', { page: capture.page }),
    noteCancelHint: t('pdfStrip.noteCancelHint'),
    noteSaveHint: t('pdfStrip.noteSaveHint'),
    notePlaceholder: t('pdfStrip.notePlaceholder'),
  };

  return (
    <SelectionStrip
      capture={capture}
      pageEl={pageEl}
      colors={colors}
      currentColorId={annotator.color}
      labels={labels}
      onPickColor={(id) => {
        annotator.setColor(id as HighlightColor);
        void annotator.apply({ kind: 'highlight', color: id as HighlightColor });
      }}
      onUnderline={() => {
        void annotator.apply({ kind: 'underline', color: annotator.color });
      }}
      onStrikethrough={() => {
        void annotator.apply({ kind: 'strikethrough', color: annotator.color });
      }}
      onSaveNote={(note) => {
        void annotator.apply({ kind: 'highlight', color: annotator.color, note });
      }}
      onDismiss={annotator.clearCapture}
    />
  );
};
