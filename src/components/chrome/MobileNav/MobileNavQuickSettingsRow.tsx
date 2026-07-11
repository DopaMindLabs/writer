import { useTranslation } from 'react-i18next';
import { MoreVertical } from '@/components/libs/icons';
import { useUI } from '@/store/ui';
import { MenuItem } from '@/components/ui/MenuItem';

/**
 * The drawer's footer action: hands off to the mobile More sheet, which carries
 * the Quick Settings controls on small screens. Closing the drawer first keeps a
 * single settings surface open at a time.
 */
export const MobileNavQuickSettingsRow = () => {
  const { t } = useTranslation('chrome');
  const setMobileNavOpen = useUI((s) => s.setMobileNavOpen);
  const setMobileMoreOpen = useUI((s) => s.setMobileMoreOpen);
  return (
    <MenuItem
      icon={MoreVertical}
      label={t('mobileNav.quickSettings')}
      data-testid="mobile-nav-quick-settings"
      className="min-h-11 shrink-0 border-t border-rule"
      onClick={() => {
        setMobileNavOpen(false);
        setMobileMoreOpen(true);
      }}
    />
  );
};
