import { useTranslation } from 'react-i18next';
import { SettingRow } from '@/components/settings/SettingRow';
import { TabHeader } from '@/components/settings/TabHeader';
import { Link } from '@/components/ui/Link';
import { EXTERNAL_LINKS } from '@/lib/routes';
import { APP_BUILD_TIME, APP_COMMIT, APP_VERSION_LABEL } from '@/lib/version';

const linkClass = 'border-b border-ink pb-px text-[13px] text-ink hover:text-ink-2';

/** "1970-01-01T00:00:00.000Z" → "1970-01-01 00:00 UTC" */
const formatBuildTime = (iso: string): string => {
  const [date, time = ''] = iso.split('T');
  return `${date} ${time.slice(0, 5)} UTC`.trim();
};

/**
 * The About tab: app version, the commit and build time embedded at build time
 * (see `vite.config.ts` defines / `lib/version`), the licence, and repository
 * links.
 */
export const AboutTab = () => {
  const { t } = useTranslation('screens');
  return (
    <section>
      <TabHeader
        titleKey="settings.about.title"
        subtitleKey="settings.about.subtitle"
      />
      <SettingRow label={t('settings.about.versionLabel')}>
        <span className="font-serif text-[14px] text-ink" data-testid="about-version">
          {t('settings.about.versionValue', { version: APP_VERSION_LABEL })}
        </span>
      </SettingRow>
      <SettingRow label={t('settings.about.commitLabel')}>
        <span className="font-mono text-[13px] text-ink" data-testid="about-commit">
          {APP_COMMIT}
        </span>
      </SettingRow>
      <SettingRow label={t('settings.about.builtLabel')}>
        <span className="font-mono text-[13px] text-ink" data-testid="about-build-time">
          {formatBuildTime(APP_BUILD_TIME)}
        </span>
      </SettingRow>
      <SettingRow label={t('settings.about.licenseLabel')}>
        <span className="font-serif text-[14px] text-ink">
          {t('settings.about.licenseValue')}
        </span>
      </SettingRow>
      <SettingRow label={t('settings.about.linksLabel')}>
        <div className="flex flex-wrap items-center gap-4">
          <Link href={EXTERNAL_LINKS.githubSource} className={linkClass}>
            {t('settings.about.links.source')}
          </Link>
          <Link
            href={`${EXTERNAL_LINKS.github}/blob/main/CHANGELOG.md`}
            className={linkClass}
          >
            {t('settings.about.links.changelog')}
          </Link>
          <Link href={EXTERNAL_LINKS.githubNewIssue} className={linkClass}>
            {t('settings.about.links.feedback')}
          </Link>
        </div>
      </SettingRow>
    </section>
  );
};
