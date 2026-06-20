import { useTranslation } from 'react-i18next';
import type { CSSProperties } from 'react';
import {
  editorFontStack,
  type EditorFont,
  type EditorSize,
} from '@/lib/editorTypography';

interface PreviewBlockProps {
  font: EditorFont;
  size: EditorSize;
  sizeScale: number;
}

export const PreviewBlock = ({ font, size, sizeScale }: PreviewBlockProps) => {
  const { t } = useTranslation('screens');
  const style: CSSProperties = {
    fontFamily: editorFontStack(font),
    fontSize: `calc(17px * ${String(sizeScale)})`,
    lineHeight: 1.6,
  };
  return (
    <div className="border-b border-rule/60 py-4">
      <div className="mb-2 text-[14px] font-medium text-ink">
        {t('settings.typography.previewLabel')}
      </div>
      <div
        data-testid="typography-preview"
        data-editor-font={font}
        data-editor-size={size}
        className="max-w-[60ch] text-ink"
        style={style}
      >
        {t('settings.typography.previewBody')}
      </div>
    </div>
  );
};
