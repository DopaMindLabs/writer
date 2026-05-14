import { renderAtRoute } from '@/test/test-utils';
import { seedDumpCanvas } from '@/test/fixtures';
import { DumpScreen } from './Dump';

describe('DumpScreen', () => {
  it('renders dump canvas with seeded notes', async () => {
    await seedDumpCanvas();
    const { findAllByText } = renderAtRoute(<DumpScreen />, {
      path: '/s/:spaceId/dump',
      initialEntries: ['/s/s1/dump'],
    });
    const matches = await findAllByText('Hello', undefined, { timeout: 3000 });
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('redirects when spaceId is missing', () => {
    const { queryByTestId } = renderAtRoute(<DumpScreen />, {
      path: '/dump',
      initialEntries: ['/dump'],
    });
    expect(queryByTestId('catch-all')).toBeInTheDocument();
  });
});
