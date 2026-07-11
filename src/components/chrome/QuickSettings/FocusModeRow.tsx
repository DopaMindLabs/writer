import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { PillToggle } from '@/components/ui/PillToggle';
import { QuickSettingRow } from './QuickSettingRow';

export const FocusModeRow = () => {
  const { t } = useTranslation('chrome');
  const [params, setParams] = useSearchParams();
  const focused = params.get('focus') === '1';

  const handleFocus = () => {
    const next = new URLSearchParams(params);
    if (focused) next.delete('focus');
    else next.set('focus', '1');
    setParams(next, { replace: false });
  };

  return (
    <QuickSettingRow
      label={t('quickSettings.focusLabel')}
      hint={t('quickSettings.focusHint')}
    >
      <PillToggle
        on={focused}
        onToggle={handleFocus}
        label={t('quickSettings.focusLabel')}
        data-testid="quick-settings-focus-toggle"
      />
    </QuickSettingRow>
  );
};
