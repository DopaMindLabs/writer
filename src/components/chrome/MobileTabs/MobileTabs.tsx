import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MobileTab } from './MobileTab';
import { useTabItems, type MobileTabsProps } from './useTabItems';

export const MobileTabs = ({ spaceId, docId }: MobileTabsProps) => {
  const { t } = useTranslation('chrome');
  const location = useLocation();
  const items = useTabItems({ spaceId, docId });

  return (
    <nav
      data-testid="mobile-tabs"
      aria-label={t('mobileTabs.write')}
      className="flex h-14 shrink-0 items-stretch border-t border-rule bg-paper pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {items.map((item) => (
        <MobileTab
          key={item.key}
          item={item}
          active={item.match ? item.match(location.pathname) : false}
        />
      ))}
    </nav>
  );
};
