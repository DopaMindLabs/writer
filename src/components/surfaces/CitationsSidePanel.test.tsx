import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, act } from '@/test/test-utils';
import { db } from '@/db/db';
import { sampleSpace } from '@/test/fixtures';
import { useUI } from '@/store/ui';
import { CitationsSidePanel } from './CitationsSidePanel';

describe('CitationsSidePanel', () => {
  it('renders nothing when the drawer is closed', () => {
    const { container } = renderWithProviders(
      <CitationsSidePanel spaceId="s1" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the citations pane when the drawer is open', async () => {
    await db.spaces.put(sampleSpace);
    act(() => {
      useUI.getState().openCitationsDrawer();
    });
    renderWithProviders(<CitationsSidePanel spaceId="s1" />);
    expect(screen.getByRole('complementary', { name: 'Citations' })).toBeInTheDocument();
    expect(await screen.findByText(/no citations yet/i)).toBeInTheDocument();
  });

  it('closes the drawer when the close button is clicked', async () => {
    await db.spaces.put(sampleSpace);
    act(() => {
      useUI.getState().openCitationsDrawer();
    });
    renderWithProviders(<CitationsSidePanel spaceId="s1" />);
    await userEvent.click(
      screen.getByRole('button', { name: /close citations/i }),
    );
    expect(useUI.getState().citationsDrawerOpen).toBe(false);
  });
});
