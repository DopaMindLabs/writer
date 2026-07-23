import { useTranslation } from 'react-i18next';
import { useUI } from '@/store/ui';
import { PillToggle } from '@/components/ui/PillToggle';
import { QuickSettingRow } from './QuickSettingRow';

export const FloatingToolbarRow = () => {
  const { t } = useTranslation('chrome');
  const floatingToolbar = useUI((s) => s.floatingToolbarEnabled);
  const setFloatingToolbar = useUI((s) => s.setFloatingToolbarEnabled);
  return (
    <QuickSettingRow label={t('quickSettings.floatingToolbarLabel')}>
      <PillToggle
        on={floatingToolbar}
        onToggle={() => { setFloatingToolbar(!floatingToolbar); }}
        label={t('quickSettings.floatingToolbarLabel')}
        data-testid="quick-settings-floating-toolbar-toggle"
      />
    </QuickSettingRow>
  );
};
