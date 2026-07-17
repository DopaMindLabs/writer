import { useTranslation } from 'react-i18next';
import { routes } from '@/lib/routes';
import { FooterLink } from './FooterLink';

export const QuickLinksFooter = () => {
  const { t } = useTranslation('chrome');
  return (
    <div className="mt-1 border-t border-rule bg-paper-2">
      <FooterLink
        to={routes.help()}
        label={t('quickSettings.helpLink')}
        kbd={t('quickSettings.helpKbd')}
        testId="quick-settings-help"
      />
      <FooterLink
        to={routes.settings('account')}
        label={t('quickSettings.account')}
        testId="quick-settings-account"
        divider
      />
      <FooterLink
        to={routes.settings()}
        label={t('quickSettings.fullSettings')}
        kbd={t('quickSettings.fullSettingsKbd')}
        testId="quick-settings-full-settings"
      />
    </div>
  );
};
