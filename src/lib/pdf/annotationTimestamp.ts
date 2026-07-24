const sameCalendarDay = (a: Date, b: Date): boolean => a.toDateString() === b.toDateString();

/**
 * Formats an annotation's creation time for the highlights panel, relative to
 * `now`: same day → the time (`14:04`), the previous calendar day → the literal
 * `YESTERDAY`, older → a short date (`24 OCT`). The result is upper-cased, with
 * ` · NOTE` appended when the annotation carries a note.
 */
export const formatAnnotationTimestamp = (
  createdAt: number,
  hasNote: boolean,
  now: Date,
): string => {
  const created = new Date(createdAt);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  let base: string;
  if (sameCalendarDay(created, now)) {
    base = created.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' });
  } else if (sameCalendarDay(created, yesterday)) {
    base = 'Yesterday';
  } else {
    base = created.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  }

  const label = base.toUpperCase();
  return hasNote ? `${label} · NOTE` : label;
};
