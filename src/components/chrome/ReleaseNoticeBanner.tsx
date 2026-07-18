import { useTranslation } from 'react-i18next';
import { InlineBanner } from '@/components/ui/InlineBanner';
import {
  daysUntilNextRelease,
  NEXT_RELEASE_AT,
  NEXT_RELEASE_LABEL,
} from '@/lib/releaseSchedule';

export interface ReleaseNoticeBannerProps {
  /** Injectable clock for tests/stories; defaults to the real time. */
  now?: number;
}

/**
 * Warns that the next release lands on a fixed date and urges setting up a
 * local sync folder or backup before then, with a days-remaining countdown.
 * Renders nothing once the release moment has passed — a stale countdown would
 * be worse than none.
 */
export const ReleaseNoticeBanner = ({ now = Date.now() }: ReleaseNoticeBannerProps) => {
  const { t } = useTranslation('screens');
  if (now >= NEXT_RELEASE_AT) return null;
  const days = daysUntilNextRelease(now);
  return (
    <InlineBanner
      kind="warning"
      className="mb-8"
      data-testid="release-notice-banner"
      title={t('home.releaseTitle', { date: NEXT_RELEASE_LABEL })}
    >
      <p>{t('home.releaseBody')}</p>
      <p
        data-testid="release-notice-countdown"
        className="mt-1 font-mono text-[11px] uppercase tracking-wider"
      >
        {t('home.releaseCountdown', { count: days })}
      </p>
    </InlineBanner>
  );
};
