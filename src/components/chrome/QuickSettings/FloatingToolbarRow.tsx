import { useTranslation } from 'react-i18next';
import { useUI } from '@/store/ui';
import { PillToggle } from '@/components/ui/PillToggle';
import { QuickSettingRow, type QuickSettingSize } from './QuickSettingRow';

export const FloatingToolbarRow = ({
  size = 'compact',
}: {
  size?: QuickSettingSize;
}) => {
  const { t } = useTranslation('chrome');
  const floatingToolbar = useUI((s) => s.floatingToolbarEnabled);
  const setFloatingToolbar = useUI((s) => s.setFloatingToolbarEnabled);
  return (
    <QuickSettingRow label={t('quickSettings.floatingToolbarLabel')} size={size}>
      <PillToggle
        on={floatingToolbar}
        onToggle={() => { setFloatingToolbar(!floatingToolbar); }}
        size={size === 'roomy' ? 'md' : 'sm'}
        label={t('quickSettings.floatingToolbarLabel')}
        data-testid="quick-settings-floating-toolbar-toggle"
      />
    </QuickSettingRow>
  );
};
