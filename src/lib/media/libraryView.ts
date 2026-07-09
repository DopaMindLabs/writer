import type { MediaItem } from '@/db/schema';

export type MediaFilter = 'all' | 'unread' | 'annotated' | 'cited';
export type MediaSort = 'recent' | 'name' | 'pages';

/** One dated group in the recent-sorted list. `monthLabel` is set only for
 * `kind: 'month'` (uppercased, with the year when it is not the current one). */
export interface MediaGroup {
  id: string;
  kind: 'today' | 'week' | 'month';
  monthLabel?: string;
  items: MediaItem[];
}

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

const startOfDay = (date: Date): number =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/**
 * Applies the active filter tab and the search query. Search is a
 * case-insensitive substring of the name; `unread` keeps never-opened items,
 * `annotated` keeps items with a highlight, `all`/`cited` keep everything (the
 * cited tab is disabled in the UI and never selected in practice).
 */
export const filterMedia = (
  items: MediaItem[],
  counts: Map<string, number>,
  filter: MediaFilter,
  query: string,
): MediaItem[] => {
  const q = query.trim().toLowerCase();
  return items.filter((item) => {
    if (q && !item.name.toLowerCase().includes(q)) return false;
    if (filter === 'unread') return item.openedAt === undefined;
    if (filter === 'annotated') return (counts.get(item.id) ?? 0) > 0;
    return true;
  });
};

/** Recent = newest first (default), name = A–Z, pages = most first. */
export const sortMedia = (items: MediaItem[], sort: MediaSort): MediaItem[] => {
  const copy = [...items];
  if (sort === 'name') return copy.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'pages') return copy.sort((a, b) => b.pageCount - a.pageCount);
  return copy.sort((a, b) => b.createdAt - a.createdAt);
};

const bucketFor = (createdAt: number, now: Date): MediaGroup => {
  const todayStart = startOfDay(now);
  if (createdAt >= todayStart) return { id: 'today', kind: 'today', items: [] };
  if (createdAt >= todayStart - WEEK_MS) return { id: 'week', kind: 'week', items: [] };
  const created = new Date(createdAt);
  const name = created.toLocaleDateString('en-GB', { month: 'long' }).toUpperCase();
  const sameYear = created.getFullYear() === now.getFullYear();
  return {
    id: `month-${String(created.getFullYear())}-${String(created.getMonth())}`,
    kind: 'month',
    monthLabel: sameYear ? name : `${name} ${String(created.getFullYear())}`,
    items: [],
  };
};

/**
 * Groups recent-sorted items into Today / Earlier this week / month buckets,
 * preserving the incoming order. Only the recent sort is grouped; name and pages
 * sorts render flat (the surface calls this only for `recent`).
 */
export const groupMediaByRecency = (items: MediaItem[], now: Date): MediaGroup[] => {
  const groups = new Map<string, MediaGroup>();
  for (const item of items) {
    const bucket = bucketFor(item.createdAt, now);
    const group = groups.get(bucket.id) ?? bucket;
    group.items.push(item);
    groups.set(bucket.id, group);
  }
  return [...groups.values()];
};
