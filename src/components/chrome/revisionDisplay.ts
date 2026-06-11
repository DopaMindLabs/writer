import type { TFunction } from 'i18next';
import type { Revision } from '@/db/schema';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export const formatRevisionAge = (
  createdAt: number,
  t: TFunction,
  now: number = Date.now(),
): string => {
  const diff = Math.max(0, now - createdAt);
  if (diff < MINUTE_MS) return t('inspector.history.ageNow');
  if (diff < HOUR_MS) {
    return t('inspector.history.ageMinutes', {
      count: Math.floor(diff / MINUTE_MS),
    });
  }
  if (diff < DAY_MS) {
    return t('inspector.history.ageHours', { count: Math.floor(diff / HOUR_MS) });
  }
  return t('inspector.history.ageDays', { count: Math.floor(diff / DAY_MS) });
};

export const formatRevisionSubtitle = (rev: Revision, t: TFunction): string =>
  rev.label ?? t(`inspector.history.kind.${rev.kind}`);
