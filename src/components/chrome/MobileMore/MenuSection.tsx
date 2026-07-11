import { useTranslation } from 'react-i18next';
import { routes } from '@/lib/routes';
import {
  QuickSettingsSheetSection,
  sheetAppMenuLinks,
} from '@/components/chrome/QuickSettings';
import { MenuGroup } from './MenuGroup';
import { InspectorItem } from './InspectorItem';
import { MoreItem } from './MoreItem';
import { ExternalMoreItem } from './ExternalMoreItem';

export const MenuSection = ({
  spaceId,
  docId,
}: {
  spaceId: string | null;
  docId: string | null;
}) => {
  const { t } = useTranslation(['chrome', 'common']);
  return (
    <div className="pb-3">
      <QuickSettingsSheetSection />
      <div className="px-4 pt-3">
        {docId && (
          <MenuGroup label={t('mobileMore.groupDoc')}>
            <InspectorItem />
          </MenuGroup>
        )}
        {spaceId && (
          <MenuGroup label={t('mobileMore.groupSpace')}>
            <MoreItem
              to={routes.spaceSettings(spaceId)}
              label={t('mobileMore.spaceSettings')}
            />
          </MenuGroup>
        )}
        <MenuGroup label={t('mobileMore.groupApp')}>
          {sheetAppMenuLinks().map((link) =>
            link.external ? (
              <ExternalMoreItem
                key={link.id}
                href={link.href}
                label={t(link.labelKey)}
              />
            ) : (
              <MoreItem key={link.id} to={link.href} label={t(link.labelKey)} />
            ),
          )}
        </MenuGroup>
      </div>
    </div>
  );
};
