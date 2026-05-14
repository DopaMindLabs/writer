import userEvent from '@testing-library/user-event';
import { renderAtRoute, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import { sampleSpace } from '@/test/fixtures';
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

async function seed() {
  await db.spaces.put(sampleSpace);
  await db.citations.put(sampleCitation);
}

describe('CitationsScreen', () => {
  it('renders the citation table with a seeded entry', async () => {
    await seed();
    const { findByText } = renderAtRoute(<CitationsScreen />, {
      path: '/s/:spaceId/citations',
      initialEntries: ['/s/s1/citations'],
    });
    expect(await findByText('On testing')).toBeInTheDocument();
    expect(await findByText('smith2020')).toBeInTheDocument();
  });

  it('search filters the visible rows', async () => {
    await db.spaces.put(sampleSpace);
    await db.citations.bulkPut([
      sampleCitation,
      { ...sampleCitation, id: 'c2', key: 'jones1999', title: 'Other book' },
    ]);
    const user = userEvent.setup();
    const { findByPlaceholderText, queryByText } = renderAtRoute(
      <CitationsScreen />,
      {
        path: '/s/:spaceId/citations',
        initialEntries: ['/s/s1/citations'],
      },
    );
    const input = await findByPlaceholderText(/authors, tags, year/i);
    await user.type(input, 'jones');
    await waitFor(() => {
      expect(queryByText('On testing')).not.toBeInTheDocument();
      expect(queryByText('Other book')).toBeInTheDocument();
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
});
