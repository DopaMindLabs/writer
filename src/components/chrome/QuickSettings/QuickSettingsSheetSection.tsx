import { useTranslation } from 'react-i18next';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { ThemeRow } from './ThemeRow';
import { ReadingWidthRow } from './ReadingWidthRow';
import { FocusModeRow } from './FocusModeRow';
import { FloatingToolbarRow } from './FloatingToolbarRow';

/**
 * The Quick Settings controls embedded in the mobile More sheet — theme,
 * reading width, focus mode and floating toolbar as roomy touch rows. Mirrors
 * the desktop popover's controls (same store, same testids) so a phone reaches
 * the same settings the rail offers on desktop.
 */
export const QuickSettingsSheetSection = () => {
  const { t } = useTranslation('chrome');
  return (
    <div data-testid="mobile-more-quick-settings">
      <SectionLabel size={9} tone="ink4" className="px-4 pb-1.5 pt-2.5">
        {t('quickSettings.title')}
      </SectionLabel>
      <ThemeRow size="roomy" />
      <ReadingWidthRow size="roomy" />
      <FocusModeRow size="roomy" />
      <FloatingToolbarRow size="roomy" />
    </div>
  );
};
