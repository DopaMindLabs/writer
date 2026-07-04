import Dexie from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Citation } from '@/db/schema';

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
  rows: Citation[];
  totalCount: number;
  totalInSpace: number;
  totalPages: number;
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

      // title/authors are unindexed — and encrypted under cloud sync, so a
      // cursor filter would not see them. Read decrypted, then match in memory.
      const all = await spaceByYear(spaceId).toArray();
      const matches = all.filter((c) => matchesQuery(c, q));
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
