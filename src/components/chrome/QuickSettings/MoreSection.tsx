import { useTranslation } from 'react-i18next';
import { ComingSoon } from '@/components/settings/ComingSoon';
import { MenuItem } from '@/components/ui/MenuItem';
import { PopoverClose } from '@/components/ui/popover';
import { Link } from '@/components/ui/Link';
import { SectionLabel } from './QuickSettingsSectionLabel';
import { QuickLinksFooter } from './QuickLinksFooter';
import { popoverAppMenuLink } from './appMenuLinks';

const PopoverMoreLink = ({ id }: { id: string }) => {
  const { t } = useTranslation('chrome');
  const link = popoverAppMenuLink(id);
  return (
    <PopoverClose asChild>
      <MenuItem asChild data-testid={link.testId}>
        <Link to={link.href}>{t(link.labelKey)}</Link>
      </MenuItem>
    </PopoverClose>
  );
};

export const MoreSection = () => {
  const { t } = useTranslation('chrome');
  return (
    <>
      <SectionLabel testId="quick-settings-section-more">
        {t('quickSettings.moreLabel')}
      </SectionLabel>

      <PopoverMoreLink id="whats-new" />

      <ComingSoon hint={t('quickSettings.feedback')} side="left" className="w-full">
        <span className="flex w-full items-center px-3.5 py-1.5 text-[13px] text-ink-2">
          {t('quickSettings.feedback')}
        </span>
      </ComingSoon>

      <PopoverMoreLink id="accessibility" />

      <PopoverMoreLink id="about" />

      <QuickLinksFooter />
    </>
  );
};
