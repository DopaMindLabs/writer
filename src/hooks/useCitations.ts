import Dexie from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Citation } from '@/db/schema';

// Loads every citation in a space, year-ascending. Reserved for explicit bulk
// operations (export); interactive rendering should use usePagedCitations so
// the table never materialises the whole library.
export const useCitations = (
  spaceId: string | null | undefined,
): Citation[] => {
  return useLiveQuery(
    async () => {
      if (!spaceId) return [];
      return db.citations.where('spaceId').equals(spaceId).sortBy('year');
    },
    [spaceId],
    [],
  );
};

export interface PagedCitationsOpts {
  page: number;
  pageSize: number;
  query: string;
}

export interface PagedCitations {
  /** The rows for the current page only. */
  rows: Citation[];
  /** Citations matching the query across all pages. */
  totalCount: number;
  /** Unfiltered citation count for the space (drives header/empty state). */
  totalInSpace: number;
  totalPages: number;
  /** The requested page clamped into range. */
  currentPage: number;
}

const EMPTY_PAGE: PagedCitations = {
  rows: [],
  totalCount: 0,
  totalInSpace: 0,
  totalPages: 1,
  currentPage: 0,
};

const spaceByYear = (spaceId: string) =>
  db.citations
    .where('[spaceId+year]')
    .between([spaceId, Dexie.minKey], [spaceId, Dexie.maxKey]);

const matchesQuery = (c: Citation, q: string): boolean =>
  [c.key, c.authors, c.title, String(c.year)]
    .join(' ')
    .toLowerCase()
    .includes(q);

// Year-ordered, space-scoped citation page served from the [spaceId+year]
// index. Without a query, only the visible page is materialised (index-based
// offset/limit). With a query, rows stream through an index cursor and only
// matches are kept — a bounded client-side fallback until full-text search
// exists; callers should debounce the query (see useDebouncedValue).
export const usePagedCitations = (
  spaceId: string | null | undefined,
  { page, pageSize, query }: PagedCitationsOpts,
): PagedCitations => {
  return useLiveQuery(
    async (): Promise<PagedCitations> => {
      if (!spaceId) return EMPTY_PAGE;

      const totalInSpace = await spaceByYear(spaceId).count();
      const q = query.trim().toLowerCase();

      if (!q) {
        const totalPages = Math.max(1, Math.ceil(totalInSpace / pageSize));
        const currentPage = Math.min(Math.max(page, 0), totalPages - 1);
        const rows = await spaceByYear(spaceId)
          .offset(currentPage * pageSize)
          .limit(pageSize)
          .toArray();
        return { rows, totalCount: totalInSpace, totalInSpace, totalPages, currentPage };
      }

      const matches = await spaceByYear(spaceId)
        .filter((c) => matchesQuery(c, q))
        .toArray();
      const totalPages = Math.max(1, Math.ceil(matches.length / pageSize));
      const currentPage = Math.min(Math.max(page, 0), totalPages - 1);
      return {
        rows: matches.slice(currentPage * pageSize, (currentPage + 1) * pageSize),
        totalCount: matches.length,
        totalInSpace,
        totalPages,
        currentPage,
      };
    },
    [spaceId, page, pageSize, query],
    EMPTY_PAGE,
  );
};
