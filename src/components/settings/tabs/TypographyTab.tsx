import { useTranslation } from 'react-i18next';
import type { CSSProperties } from 'react';
import { TabHeader } from '@/components/settings/TabHeader';
import { SettingRow } from '@/components/settings/SettingRow';
import { Chip } from '@/components/ui/Chip';
import { useUI } from '@/store/ui';
import {
  EDITOR_FONTS,
  EDITOR_SIZES,
  editorFontStack,
  editorSizeScale,
  type EditorFont,
  type EditorSize,
} from '@/lib/editorTypography';

const FontRow = () => {
  const { t } = useTranslation('screens');
  const editorFont = useUI((s) => s.editorFont);
  const setEditorFont = useUI((s) => s.setEditorFont);
  return (
    <SettingRow
      data-testid="setting-editor-font"
      label={t('settings.typography.editorFontLabel')}
      hint={t('settings.typography.editorFontHint')}
    >
      <div role="group" aria-label={t('settings.typography.editorFontLabel')} className="flex flex-wrap gap-1.5">
        {EDITOR_FONTS.map((font) => (
          <Chip
            key={font}
            active={font === editorFont}
            onClick={() => { setEditorFont(font); }}
            data-testid={`editor-font-${font}`}
            style={{ fontFamily: editorFontStack(font) }}
          >
            {t(`settings.typography.editorFontOptions.${font}`)}
          </Chip>
        ))}
      </div>
    </SettingRow>
  );
};

const SizeRow = () => {
  const { t } = useTranslation('screens');
  const editorSize = useUI((s) => s.editorSize);
  const setEditorSize = useUI((s) => s.setEditorSize);
  return (
    <SettingRow
      data-testid="setting-editor-size"
      label={t('settings.typography.editorSizeLabel')}
      hint={t('settings.typography.editorSizeHint')}
    >
      <div role="group" aria-label={t('settings.typography.editorSizeLabel')} className="flex flex-wrap gap-1.5">
        {EDITOR_SIZES.map((size) => (
          <Chip
            key={size}
            active={size === editorSize}
            onClick={() => { setEditorSize(size); }}
            data-testid={`editor-size-${size}`}
          >
            {t(`settings.typography.editorSizeOptions.${size}`)}
          </Chip>
        ))}
      </div>
    </SettingRow>
  );
};

const PreviewBlock = ({
  font,
  size,
}: {
  font: EditorFont;
  size: EditorSize;
}) => {
  const { t } = useTranslation('screens');
  const style: CSSProperties = {
    fontFamily: editorFontStack(font),
    fontSize: `calc(17px * ${String(editorSizeScale(size))})`,
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

export const TypographyTab = () => {
  const editorFont = useUI((s) => s.editorFont);
  const editorSize = useUI((s) => s.editorSize);
  return (
    <section>
      <TabHeader
        titleKey="settings.typography.title"
        subtitleKey="settings.typography.subtitle"
      />
      <FontRow />
      <SizeRow />
      <PreviewBlock font={editorFont} size={editorSize} />
    </section>
  );
};
