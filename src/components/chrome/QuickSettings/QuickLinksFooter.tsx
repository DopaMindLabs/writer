import { useTranslation } from 'react-i18next';
import { Kbd } from '@/components/ui/Kbd';
import { QuickLink } from './QuickLink';
import { popoverAppMenuLink } from './appMenuLinks';

export const QuickLinksFooter = () => {
  const { t } = useTranslation('chrome');
  const help = popoverAppMenuLink('help');
  const account = popoverAppMenuLink('account');
  const fullSettings = popoverAppMenuLink('universal-settings');
  return (
    <div className="mt-1 border-t border-rule bg-paper-2">
      <QuickLink
        to={help.href}
        label={t(help.labelKey)}
        kbd={<Kbd keys="mod+?" />}
        testId={help.testId}
      />
      <QuickLink
        to={account.href}
        label={t(account.labelKey)}
        testId={account.testId}
        divider
      />
      <QuickLink
        to={fullSettings.href}
        label={t(fullSettings.labelKey)}
        kbd={<Kbd keys="mod+," />}
        testId={fullSettings.testId}
      />
    </div>
  );
};
