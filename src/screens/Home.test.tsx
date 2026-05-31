import { renderWithProviders } from '@/test/test-utils';
import { seedMultipleSpaces } from '@/test/fixtures';
import { HomeScreen } from './Home';

describe('HomeScreen', () => {
  it('shows the empty state when no spaces exist', async () => {
    const { findByText } = renderWithProviders(<HomeScreen />);
    expect(await findByText(/Start a new space/i)).toBeInTheDocument();
    expect(await findByText(/Your first space/i)).toBeInTheDocument();
  });

  it('shows continue link when a space exists', async () => {
    await seedMultipleSpaces();
    const { findByText } = renderWithProviders(<HomeScreen />);
    expect(await findByText(/Continue writing/i)).toBeInTheDocument();
  });
});
