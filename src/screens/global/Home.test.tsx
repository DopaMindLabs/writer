import { renderWithProviders } from '@/test/test-utils';
import { seedMultipleSpaces } from '@/test/fixtures';
import { db } from '@/db/db';
import { APP_VERSION_LABEL } from '@/lib/version';
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

  it('shows the version chip and a sync warning chip when no sync folder is connected', async () => {
    const { findByTestId } = renderWithProviders(<HomeScreen />);
    expect(await findByTestId('home-version-chip')).toHaveTextContent(
      APP_VERSION_LABEL,
    );
    expect(await findByTestId('home-sync-chip')).toHaveTextContent(
      /sync\/backups not enabled · data can be lost/i,
    );
  });

  it('flips the sync chip to the enabled state once a sync folder is connected', async () => {
    await db.meta.put({ key: 'syncFolderHandle', value: { name: 'Writing' } });
    const { findByTestId } = renderWithProviders(<HomeScreen />);
    const chip = await findByTestId('home-sync-chip');
    await expect
      .poll(() => chip.textContent)
      .toMatch(/folder sync on/i);
  });
});
