const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const isoDate = (d: Date): string => {
  return d.toISOString().slice(0, 10);
};

const isoDateTime = (d: Date): string => {
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${isoDate(d)} ${hh}:${mm}`;
};

export const formatDocName = (
  pattern: string,
  now: Date = new Date(),
): string => {
  return pattern
    .replace(/\{\{date\}\}/g, isoDate(now))
    .replace(/\{\{datetime\}\}/g, isoDateTime(now))
    .replace(/\{\{day\}\}/g, DAYS[now.getUTCDay()]);
};
