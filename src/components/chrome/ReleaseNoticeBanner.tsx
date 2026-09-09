import { useTranslation } from 'react-i18next';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { useNow } from '@/hooks/useNow';
import {
  daysUntilNextRelease,
  NEXT_RELEASE_AT,
  NEXT_RELEASE_LABEL,
} from '@/lib/releaseSchedule';
import { Eyebrow } from '@/components/ui/Eyebrow';

export interface ReleaseNoticeBannerProps {
  /** Injectable clock for tests/stories; defaults to the real, ticking time. */
  now?: number;
}

/**
 * Notification that the next release is on a fixed date, urging a local sync
 * folder or backup before then, with a days-remaining countdown. Renders
 * nothing once the release moment has passed — a stale countdown would be
 * worse than none.
 */
export const ReleaseNoticeBanner = ({ now }: ReleaseNoticeBannerProps) => {
  const { t } = useTranslation('screens');
  const clock = useNow(now);
  if (clock >= NEXT_RELEASE_AT) return null;
  const days = daysUntilNextRelease(clock);
  return (
    <InlineBanner
      kind="info"
      className="mb-8"
      data-testid="release-notice-banner"
      title={t('home.releaseTitle', { date: NEXT_RELEASE_LABEL })}
    >
      <p>{t('home.releaseBody')}</p>
      <Eyebrow asChild size={11} tone="inherit">
        <p data-testid="release-notice-countdown" className="mt-1">
          {t('home.releaseCountdown', { count: days })}
        </p>
      </Eyebrow>
    </InlineBanner>
  );
};
