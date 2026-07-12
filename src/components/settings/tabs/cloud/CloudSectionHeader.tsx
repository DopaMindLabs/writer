import { useTranslation } from 'react-i18next';

/**
 * The cloud section's heading: title, subtitle, and the beta notice naming the
 * two-device limit and advising local backups while the beta runs.
 */
export const CloudSectionHeader = () => {
  const { t } = useTranslation('screens');
  const k = (name: string) => t(`settings.account.cloud.${name}`);
  return (
    <>
      <h2 className="text-[15px] font-semibold text-ink">{k('title')}</h2>
      <p className="mt-1 max-w-[540px] font-serif text-[13px] text-ink-2">
        {k('subtitle')}
      </p>
      <p className="mb-4 mt-1 max-w-[540px] font-serif text-[13px] text-ink-3">
        {k('deviceLimit.betaNotice')}
      </p>
    </>
  );
};
