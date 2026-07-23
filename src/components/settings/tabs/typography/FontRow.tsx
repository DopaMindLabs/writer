import { useTranslation } from 'react-i18next';
import { SettingRow } from '@/components/settings/SettingRow';
import { Chip } from '@/components/ui/Chip';
import { useUI } from '@/store/ui';
import { EDITOR_FONTS, editorFontStack } from '@/lib/editorTypography';

export const FontRow = () => {
  const { t } = useTranslation('screens');
  const editorFont = useUI((s) => s.editorFont);
  const setEditorFont = useUI((s) => s.setEditorFont);
  return (
    <SettingRow
      data-testid="setting-editor-font"
      label={t('settings.typography.editorFontLabel')}
      hint={t('settings.typography.editorFontHint')}
    >
      <div
        role="group"
        aria-label={t('settings.typography.editorFontLabel')}
        className="flex flex-wrap gap-1.5"
      >
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
