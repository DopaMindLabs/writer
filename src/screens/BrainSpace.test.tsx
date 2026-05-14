import { renderAtRoute } from '@/test/test-utils';
import { seedBrainSpaceCanvas } from '@/test/fixtures';
import { BrainSpaceScreen } from './BrainSpace';

describe('BrainSpaceScreen', () => {
  it('renders brain space canvas with seeded notes', async () => {
    await seedBrainSpaceCanvas();
    const { findAllByText } = renderAtRoute(<BrainSpaceScreen />, {
      path: '/s/:spaceId/dump',
      initialEntries: ['/s/s1/dump'],
    });
    const matches = await findAllByText('Hello', undefined, { timeout: 3000 });
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('redirects when spaceId is missing', () => {
    const { queryByTestId } = renderAtRoute(<BrainSpaceScreen />, {
      path: '/dump',
      initialEntries: ['/dump'],
    });
    expect(queryByTestId('catch-all')).toBeInTheDocument();
  });
});
