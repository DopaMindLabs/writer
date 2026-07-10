import { renderWithProviders } from '@/test/test-utils';
import { seedMultipleSpaces } from '@/test/fixtures';
import { FocusRail } from './FocusRail';

describe('FocusRail', () => {
  beforeEach(seedMultipleSpaces);

  it('renders space dots with active highlight', async () => {
    const { container, findByLabelText } = renderWithProviders(
      <FocusRail activeSpaceId="s2" />,
    );
    await findByLabelText('Beta');
    expect(container).toMatchSnapshot();
  });
});
