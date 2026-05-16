import userEvent from '@testing-library/user-event';
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

  it('exposes a Quick Settings trigger at the bottom of the rail', async () => {
    renderWithProviders(<SpaceRail activeSpaceId="s1" />);
    expect(
      await screen.findByRole('button', { name: /LIpsum Writer/i }),
    ).toBeInTheDocument();
  });

  it('opens the Quick Settings popover with the theme picker when the trigger is clicked', async () => {
    renderWithProviders(<SpaceRail activeSpaceId="s1" />);
    await userEvent.click(
      await screen.findByRole('button', { name: /LIpsum Writer/i }),
    );
    expect(await screen.findByTestId('quick-settings-popover')).toBeInTheDocument();
    // Theme chips, focus toggle, floating toolbar toggle, and the full-settings escape are present.
    expect(screen.getByText(/^quick settings$/i)).toBeInTheDocument();
    expect(screen.getByText(/^theme$/i)).toBeInTheDocument();
    expect(
      screen.getByRole('switch', { name: /focus mode/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/full settings/i)).toBeInTheDocument();
  });
});
