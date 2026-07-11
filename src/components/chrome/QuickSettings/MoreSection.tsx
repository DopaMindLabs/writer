import { useTranslation } from 'react-i18next';
import { routes } from '@/lib/routes';
import { ComingSoon } from '@/components/settings/ComingSoon';
import { MenuItem } from '@/components/ui/MenuItem';
import { PopoverClose } from '@/components/ui/popover';
import { Link } from '@/components/ui/Link';
import { SectionLabel } from './QuickSettingsSectionLabel';
import { QuickLinksFooter } from './QuickLinksFooter';

export const MoreSection = () => {
  const { t } = useTranslation('chrome');
  return (
    <>
      <SectionLabel testId="quick-settings-section-more">
        {t('quickSettings.moreLabel')}
      </SectionLabel>

      <PopoverClose asChild>
        <MenuItem asChild data-testid="quick-settings-whats-new">
          <Link to={routes.helpArticle('whats-new')}>
            {t('quickSettings.whatsNew')}
          </Link>
        </MenuItem>
      </PopoverClose>

      <ComingSoon hint={t('quickSettings.feedback')} side="left" className="w-full">
        <span className="flex w-full items-center px-3.5 py-1.5 text-[13px] text-ink-2">
          {t('quickSettings.feedback')}
        </span>
      </ComingSoon>

      <PopoverClose asChild>
        <MenuItem asChild data-testid="quick-settings-accessibility">
          <Link to={routes.settings('accessibility')}>
            {t('quickSettings.accessibility')}
          </Link>
        </MenuItem>
      </PopoverClose>

      <PopoverClose asChild>
        <MenuItem asChild data-testid="quick-settings-about">
          <Link to={routes.about()}>{t('quickSettings.about')}</Link>
        </MenuItem>
      </PopoverClose>

      <QuickLinksFooter />
    </>
  );
};
