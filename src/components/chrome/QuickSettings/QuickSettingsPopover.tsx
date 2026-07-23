import { useTranslation } from 'react-i18next';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Kbd } from '@/components/ui/Kbd';
import { SectionLabel } from './QuickSettingsSectionLabel';
import { ThemeRow } from './ThemeRow';
import { ReadingWidthRow } from './ReadingWidthRow';
import { FocusModeRow } from './FocusModeRow';
import { FloatingToolbarRow } from './FloatingToolbarRow';
import { HelpToursSection } from './HelpToursSection';
import { MoreSection } from './MoreSection';
import { QuickLink } from './QuickLink';
import { popoverAppMenuLink } from './appMenuLinks';

export const QuickSettingsPopover = () => {
  const { t } = useTranslation('chrome');
  // The guided-tour list is desk-work: it belongs on the roomy desktop popover,
  // not on the thumb-height mobile sheet where it pushes the real controls
  // (theme, width, focus) below the fold.
  const isMobile = useMediaQuery('(max-width: 767px)');
  const fullSettings = popoverAppMenuLink('universal-settings');
  const account = popoverAppMenuLink('account');

  return (
    <div
      data-testid="quick-settings-popover"
      className="w-72 max-h-[var(--radix-popover-content-available-height)] overflow-y-auto overscroll-contain bg-paper font-sans"
    >
      <div className="border-b border-rule px-4 pb-3 pt-3.5">
        <div className="font-serif text-[16px] font-medium tracking-tight text-ink">
          {t('quickSettings.title')}
        </div>
      </div>

      <SectionLabel testId="quick-settings-section-appearance">
        {t('quickSettings.appearanceLabel')}
      </SectionLabel>

      <ThemeRow />

      <ReadingWidthRow />

      <SectionLabel testId="quick-settings-section-writing">
        {t('quickSettings.writingLabel')}
      </SectionLabel>

      <FocusModeRow />

      <FloatingToolbarRow />

      <QuickLink
        to={fullSettings.href}
        label={t(fullSettings.labelKey)}
        kbd={<Kbd keys="mod+," />}
        testId={fullSettings.testId}
      />

      <QuickLink
        to={account.href}
        label={t(account.labelKey)}
        testId={account.testId}
      />

      {!isMobile && <HelpToursSection />}

      <MoreSection />
    </div>
  );
};
