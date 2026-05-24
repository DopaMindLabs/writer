import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { renderWithProviders, screen, act } from '@/test/test-utils';
import { db } from '@/db/db';
import { sampleSpace } from '@/test/fixtures';
import { useUI } from '@/store/ui';
import { CitationsSidePanel } from './CitationsSidePanel';

const LocationProbe = () => {
  const loc = useLocation();
  return <div data-testid="location">{loc.pathname}</div>;
};

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

  it('expand button closes the drawer and navigates to the full citations screen', async () => {
    await db.spaces.put(sampleSpace);
    act(() => {
      useUI.getState().openCitationsDrawer();
    });
    renderWithProviders(
      <>
        <CitationsSidePanel spaceId="s1" />
        <LocationProbe />
      </>,
      { initialEntries: ['/s/s1/d/d1'] },
    );
    await userEvent.click(
      screen.getByRole('button', { name: /open citations in full view/i }),
    );
    expect(useUI.getState().citationsDrawerOpen).toBe(false);
    expect(screen.getByTestId('location').textContent).toBe('/s/s1/citations');
  });
});
