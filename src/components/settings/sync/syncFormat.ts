import type { TFunction } from 'i18next';

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${String(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const formatRelativeTime = (
  when: number,
  t: TFunction,
  now: number = Date.now(),
): string => {
  const diffSec = Math.max(0, Math.floor((now - when) / 1000));
  if (diffSec < 60) return t('settings.sync.justNow');
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${String(diffMin)} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${String(diffHr)} h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${String(diffDay)} d ago`;
  return new Date(when).toISOString().slice(0, 10);
};

export const intervalLabel = (min: number, t: TFunction): string => {
  if (min <= 0) return t('settings.sync.intervalOff');
  return t('settings.sync.intervalMinutes', { count: min });
};
