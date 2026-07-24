import { describe, it, expect } from 'vitest';
import { PDF_MIME } from '@/data/media';
import type { MediaItem } from '@/db/schema';
import { filterMedia, sortMedia, groupMediaByRecency } from './libraryView';

const item = (over: Partial<MediaItem> & { id: string }): MediaItem => ({
  spaceId: 's1',
  name: 'doc.pdf',
  mime: PDF_MIME,
  size: 1,
  pageCount: 1,
  blob: new Blob(['%PDF'], { type: PDF_MIME }),
  createdAt: 0,
  updatedAt: 0,
  ...over,
});

const ids = (items: MediaItem[]): string[] => items.map((m) => m.id);

describe('filterMedia', () => {
  const items = [
    item({ id: 'a', name: 'Beagle voyage.pdf' }),
    item({ id: 'b', name: 'Origin of species.pdf', openedAt: 5 }),
    item({ id: 'c', name: 'Descent of man.pdf' }),
  ];
  const counts = new Map([['c', 2]]);

  it('narrows by a case-insensitive name substring', () => {
    expect(ids(filterMedia(items, counts, 'all', 'ORIGIN'))).toEqual(['b']);
  });

  it('keeps only never-opened items under unread', () => {
    expect(ids(filterMedia(items, counts, 'unread', ''))).toEqual(['a', 'c']);
  });

  it('keeps only annotated items under annotated', () => {
    expect(ids(filterMedia(items, counts, 'annotated', ''))).toEqual(['c']);
  });

  it('keeps everything under all', () => {
    expect(ids(filterMedia(items, counts, 'all', ''))).toEqual(['a', 'b', 'c']);
  });
});

describe('sortMedia', () => {
  const items = [
    item({ id: 'old', name: 'Zebra.pdf', pageCount: 3, createdAt: 10 }),
    item({ id: 'new', name: 'Apple.pdf', pageCount: 20, createdAt: 30 }),
    item({ id: 'mid', name: 'Mango.pdf', pageCount: 8, createdAt: 20 }),
  ];

  it('sorts recent newest first', () => {
    expect(ids(sortMedia(items, 'recent'))).toEqual(['new', 'mid', 'old']);
  });

  it('sorts name A–Z', () => {
    expect(ids(sortMedia(items, 'name'))).toEqual(['new', 'mid', 'old']);
  });

  it('sorts pages most first', () => {
    expect(ids(sortMedia(items, 'pages'))).toEqual(['new', 'mid', 'old']);
  });

  it('does not mutate its input', () => {
    const input = [...items];
    sortMedia(input, 'name');
    expect(ids(input)).toEqual(['old', 'new', 'mid']);
  });
});

describe('groupMediaByRecency', () => {
  const now = new Date(2024, 9, 15, 12, 0, 0);
  const at = (...parts: [number, number, number]): number =>
    new Date(parts[0], parts[1], parts[2], 9).getTime();

  it('buckets into today, this week and dated months', () => {
    const items = [
      item({ id: 'today', createdAt: at(2024, 9, 15) }),
      item({ id: 'week', createdAt: at(2024, 9, 12) }),
      item({ id: 'aug', createdAt: at(2024, 7, 20) }),
      item({ id: 'dec', createdAt: at(2023, 11, 5) }),
    ];
    const groups = groupMediaByRecency(items, now);
    expect(groups.map((g) => g.kind)).toEqual(['today', 'week', 'month', 'month']);
    expect(groups[0].items.map((m) => m.id)).toEqual(['today']);
    expect(groups[1].items.map((m) => m.id)).toEqual(['week']);
    // This year omits the year; an older year keeps it.
    expect(groups[2].monthLabel).toBe('AUGUST');
    expect(groups[3].monthLabel).toBe('DECEMBER 2023');
  });

  it('collects same-month items into one group in order', () => {
    const items = [
      item({ id: 'a', createdAt: at(2024, 7, 25) }),
      item({ id: 'b', createdAt: at(2024, 7, 3) }),
    ];
    const groups = groupMediaByRecency(items, now);
    expect(groups).toHaveLength(1);
    expect(groups[0].items.map((m) => m.id)).toEqual(['a', 'b']);
  });
});
