import { renderWithProviders } from '@/test/test-utils';
import { seedMultipleSpaces } from '@/test/fixtures';
import { SpaceRail } from './SpaceRail';

describe('SpaceRail', () => {
  beforeEach(seedMultipleSpaces);

  it('renders rail with seeded spaces and active highlight', async () => {
    const { container, findByText } = renderWithProviders(
      <SpaceRail activeSpaceId="s2" />,
    );
    await findByText('BBB');
    expect(container).toMatchSnapshot();
  });
});
