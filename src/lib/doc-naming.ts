const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isoDateTime(d: Date): string {
  return `${isoDate(d)} ${d.toTimeString().slice(0, 5)}`;
}

export function formatDocName(pattern: string, now: Date = new Date()): string {
  return pattern
    .replace(/\{\{date\}\}/g, isoDate(now))
    .replace(/\{\{datetime\}\}/g, isoDateTime(now))
    .replace(/\{\{day\}\}/g, DAYS[now.getDay()]);
}
