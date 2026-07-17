import { useTranslation } from 'react-i18next';
import { EXTERNAL_LINKS, routes } from '@/lib/routes';
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
    <div className="px-4 pb-3 pt-4">
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
        <MoreItem to={routes.settings()} label={t('mobileMore.settings')} />
        <MoreItem to={routes.about()} label={t('mobileMore.about')} />
        <MoreItem to={routes.help()} label={t('mobileMore.help')} />
        <MoreItem
          to={routes.helpArticle('whats-new')}
          label={t('mobileMore.whatsNew')}
        />
        <ExternalMoreItem
          href={EXTERNAL_LINKS.githubNewIssue}
          label={t('mobileMore.contact')}
        />
      </MenuGroup>
    </div>
  );
};
