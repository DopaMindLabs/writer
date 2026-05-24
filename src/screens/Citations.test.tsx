import userEvent from '@testing-library/user-event';
import { act, renderAtRoute, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import { sampleSpace, seedBasicSpace } from '@/test/fixtures';
import { useUI } from '@/store/ui';
import type { Citation } from '@/db/schema';
import { CitationsScreen } from './Citations';

const sampleCitation: Citation = {
  id: 'c1',
  spaceId: 's1',
  key: 'smith2020',
  authors: 'Smith, John',
  title: 'On testing',
  year: 2020,
  type: 'article',
  useCount: 0,
};

const seed = async () => {
  await db.spaces.put(sampleSpace);
  await db.citations.put(sampleCitation);
};

describe('CitationsScreen', () => {
  it('renders the citation table with a seeded entry', async () => {
    await seed();
    const { findAllByText } = renderAtRoute(<CitationsScreen />, {
      path: '/s/:spaceId/citations',
      initialEntries: ['/s/s1/citations'],
    });
    expect((await findAllByText('On testing')).length).toBeGreaterThan(0);
    expect((await findAllByText('smith2020')).length).toBeGreaterThan(0);
  });

  it('search filters the visible rows', async () => {
    await db.spaces.put(sampleSpace);
    await db.citations.bulkPut([
      sampleCitation,
      { ...sampleCitation, id: 'c2', key: 'jones1999', title: 'Other book' },
    ]);
    const user = userEvent.setup();
    const { findByPlaceholderText, queryAllByText } = renderAtRoute(
      <CitationsScreen />,
      {
        path: '/s/:spaceId/citations',
        initialEntries: ['/s/s1/citations'],
      },
    );
    const input = await findByPlaceholderText(/authors, tags, year/i);
    await user.type(input, 'jones');
    await waitFor(() => {
      expect(queryAllByText('On testing')).toHaveLength(0);
      expect(queryAllByText('Other book').length).toBeGreaterThan(0);
    });
  });

  it('clicking + add toggles the manual add form', async () => {
    await seed();
    const user = userEvent.setup();
    const { findByText, queryByText } = renderAtRoute(<CitationsScreen />, {
      path: '/s/:spaceId/citations',
      initialEntries: ['/s/s1/citations'],
    });
    await user.click(await findByText('+ add'));
    expect(await findByText('× cancel')).toBeInTheDocument();
    await user.click(await findByText('× cancel'));
    expect(queryByText('× cancel')).not.toBeInTheDocument();
  });

  it('redirects when spaceId is missing', () => {
    const { queryByTestId } = renderAtRoute(<CitationsScreen />, {
      path: '/citations',
      initialEntries: ['/citations'],
    });
    expect(queryByTestId('catch-all')).toBeInTheDocument();
  });

  it('renders the docs sidebar so the user can navigate back to a doc', async () => {
    await seedBasicSpace();
    await db.citations.put(sampleCitation);
    act(() => useUI.getState().setCurrentDocId('d1'));
    const { findByRole, findAllByText } = renderAtRoute(<CitationsScreen />, {
      path: '/s/:spaceId/citations',
      initialEntries: ['/s/s1/citations'],
    });
    const sidebar = await findByRole('link', { name: /sample doc/i });
    expect(sidebar).toHaveAttribute('href', '/s/s1/d/d1');
    expect((await findAllByText('On testing')).length).toBeGreaterThan(0);
  });
});
