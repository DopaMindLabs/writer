import { renderWithProviders, screen } from '@/test/test-utils';
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

  it('renders non-active shared-space dot when the active space is different', async () => {
    renderWithProviders(<SpaceRail activeSpaceId="s1" />);
    // The shared marker is the small dot inside the BBB link.
    const sharedLink = await screen.findByRole('link', { name: /^BBB$/ });
    const dot = sharedLink.querySelector('span');
    expect(dot).not.toBeNull();
    expect(dot!.className).toContain('bg-ink');
  });

  it('renders without crashing when no space is active', async () => {
    renderWithProviders(<SpaceRail activeSpaceId={null} />);
    expect(await screen.findByRole('link', { name: /^AAA$/ })).toBeInTheDocument();
  });
});
