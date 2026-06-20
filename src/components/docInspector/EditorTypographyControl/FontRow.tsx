import { useTranslation } from 'react-i18next';
import { Chip } from '@/components/ui/Chip';
import type { Doc } from '@/db/schema';
import {
  EDITOR_FONTS,
  editorFontStack,
  type EditorFont,
} from '@/lib/editorTypography';

interface FontRowProps {
  doc: Doc;
  globalFont: EditorFont;
  onSelect: (font: EditorFont) => void;
}

export const FontRow = ({ doc, globalFont, onSelect }: FontRowProps) => {
  const { t } = useTranslation('chrome');
  const active = doc.editorFont ?? globalFont;
  return (
    <div className="border-b border-rule/60 py-2">
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-3">
        {t('inspector.typography.fontLabel')}
      </div>
      <div
        role="group"
        aria-label={t('inspector.typography.fontLabel')}
        className="flex flex-wrap gap-1.5"
      >
        {EDITOR_FONTS.map((font) => (
          <Chip
            key={font}
            active={font === active}
            onClick={() => { onSelect(font); }}
            data-testid={`inspector-editor-font-${font}`}
            style={{ fontFamily: editorFontStack(font) }}
          >
            {t(`inspector.typography.fontOptions.${font}`)}
          </Chip>
        ))}
      </div>
    </div>
  );
};
