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
    const tag = await screen.findByText('BBB');
    const sharedLink = tag.closest('a');
    expect(sharedLink).not.toBeNull();
    const dot = sharedLink!.querySelector('span');
    expect(dot).not.toBeNull();
    expect(dot!.className).toContain('bg-ink');
  });

  it('renders without crashing when no space is active', async () => {
    renderWithProviders(<SpaceRail activeSpaceId={null} />);
    const tag = await screen.findByText('AAA');
    expect(tag.closest('a')).toBeInTheDocument();
  });
});
