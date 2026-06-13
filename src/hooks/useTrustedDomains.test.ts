import { renderHook, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import { useTrustedDomains } from './useTrustedDomains';

describe('useTrustedDomains', () => {
  it('returns trusted domains ordered alphabetically', async () => {
    await db.trustedDomains.bulkPut([
      { domain: 'github.com', addedAt: 2 },
      { domain: 'arxiv.org', addedAt: 1 },
      { domain: 'openreview.net', addedAt: 3 },
    ]);

    const { result } = renderHook(() => useTrustedDomains());

    await waitFor(() => {
      expect(result.current.map((d) => d.domain)).toEqual([
        'arxiv.org',
        'github.com',
        'openreview.net',
      ]);
    });
  });

  it('reflects live changes to the table', async () => {
    const { result } = renderHook(() => useTrustedDomains());
    await waitFor(() => {
      expect(result.current).toEqual([]);
    });

    await db.trustedDomains.put({ domain: 'arxiv.org', addedAt: 1 });

    await waitFor(() => {
      expect(result.current.map((d) => d.domain)).toEqual(['arxiv.org']);
    });
  });
});
