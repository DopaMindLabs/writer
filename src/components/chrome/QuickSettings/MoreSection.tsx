import { useTranslation } from 'react-i18next';
import { routes } from '@/lib/routes';
import { ComingSoon } from '@/components/settings/ComingSoon';
import { SectionLabel } from './QuickSettingsSectionLabel';
import { MenuItem } from './QuickSettingsMenuItem';
import { QuickLinksFooter } from './QuickLinksFooter';

export const MoreSection = () => {
  const { t } = useTranslation('chrome');
  return (
    <>
      <SectionLabel testId="quick-settings-section-more">
        {t('quickSettings.moreLabel')}
      </SectionLabel>

      <MenuItem
        asChild
        href={routes.helpArticle('whats-new')}
        testId="quick-settings-whats-new"
      >
        {t('quickSettings.whatsNew')}
      </MenuItem>

      <ComingSoon
        hint={t('quickSettings.feedback')}
        side="left"
        className="w-full"
      >
        <span className="flex w-full items-center gap-2 px-4 py-1.5 text-[13px] text-ink-2">
          <span className="h-3 w-3 shrink-0 opacity-0" />
          <span className="flex-1 text-left">
            {t('quickSettings.feedback')}
          </span>
        </span>
      </ComingSoon>

      <MenuItem
        asChild
        href={routes.settings('accessibility')}
        testId="quick-settings-accessibility"
      >
        {t('quickSettings.accessibility')}
      </MenuItem>

      <MenuItem
        asChild
        href={routes.about()}
        testId="quick-settings-about"
      >
        {t('quickSettings.about')}
      </MenuItem>

      <QuickLinksFooter />
    </>
  );
};
