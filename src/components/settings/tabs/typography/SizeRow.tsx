import { useTranslation } from 'react-i18next';
import { SettingRow } from '@/components/settings/SettingRow';
import { Chip } from '@/components/ui/Chip';
import { useUI } from '@/store/ui';
import { EDITOR_SIZES } from '@/lib/editorTypography';

export const SizeRow = () => {
  const { t } = useTranslation('screens');
  const editorSize = useUI((s) => s.editorSize);
  const setEditorSize = useUI((s) => s.setEditorSize);
  return (
    <SettingRow
      data-testid="setting-editor-size"
      label={t('settings.typography.editorSizeLabel')}
      hint={t('settings.typography.editorSizeHint')}
    >
      <div
        role="group"
        aria-label={t('settings.typography.editorSizeLabel')}
        className="flex flex-wrap gap-1.5"
      >
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
