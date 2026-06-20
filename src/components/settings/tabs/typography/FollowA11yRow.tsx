import { useTranslation } from 'react-i18next';
import { SettingRow } from '@/components/settings/SettingRow';
import { PillToggle } from '@/components/ui/PillToggle';
import { useUI } from '@/store/ui';

export const FollowA11yRow = () => {
  const { t } = useTranslation('screens');
  const follow = useUI((s) => s.editorSizeFollowsA11y);
  const setFollow = useUI((s) => s.setEditorSizeFollowsA11y);
  return (
    <SettingRow
      data-testid="setting-editor-follows-a11y"
      label={t('settings.typography.followA11yLabel')}
      hint={t('settings.typography.followA11yHint')}
    >
      <PillToggle
        on={follow}
        onToggle={() => { setFollow(!follow); }}
        label={t('settings.typography.followA11yLabel')}
      />
    </SettingRow>
  );
};
