import userEvent from '@testing-library/user-event';
import { renderWithProviders, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import { seedDumpCanvas, sampleSpace } from '@/test/fixtures';
import { DumpCanvas } from './DumpCanvas';

describe('DumpCanvas', () => {
  it('renders canvas with seeded notes and connection', async () => {
    await seedDumpCanvas();
    const { container, findAllByText } = renderWithProviders(
      <DumpCanvas spaceId="s1" />,
    );
    await findAllByText('Hello');
    expect(container).toMatchSnapshot();
  });

  it('clicking a toolbar kind adds a new note to Dexie', async () => {
    await db.spaces.put(sampleSpace);
    const user = userEvent.setup();
    const { findByText } = renderWithProviders(<DumpCanvas spaceId="s1" />);
    const button = await findByText(/\+ blank/i);
    expect(await db.notes.count()).toBe(0);
    await user.click(button);
    await waitFor(async () => {
      expect(await db.notes.count()).toBe(1);
    });
  });

  it('renders the empty state when no notes exist', async () => {
    await db.spaces.put(sampleSpace);
    const { findByText } = renderWithProviders(<DumpCanvas spaceId="s1" />);
    expect(await findByText('start dumping')).toBeInTheDocument();
  });
});
