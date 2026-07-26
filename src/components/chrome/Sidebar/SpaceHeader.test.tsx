import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { sampleSpace } from '@/test/fixtures';
import { SpaceHeader } from './SpaceHeader';

describe('SpaceHeader', () => {
  it('shows the space name and the space menu when a space is provided', () => {
    renderWithProviders(<SpaceHeader spaceId={sampleSpace.id} space={sampleSpace} />);
    const title = screen.getByTestId('sidebar-space-title');
    expect(title).toHaveTextContent(sampleSpace.name);
    expect(title).toBeEnabled();
    expect(screen.getByTestId('sidebar-space-menu-trigger')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-space-subtitle')).toBeInTheDocument();
  });

  it('shows a placeholder title with no menu while the space is loading', () => {
    renderWithProviders(<SpaceHeader spaceId="sp1" space={undefined} />);
    const title = screen.getByTestId('sidebar-space-title');
    expect(title).toHaveTextContent('…');
    expect(title).toBeDisabled();
    expect(
      screen.queryByTestId('sidebar-space-menu-trigger'),
    ).not.toBeInTheDocument();
  });

  it('enters rename mode with an input carrying the current name when the title is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SpaceHeader spaceId={sampleSpace.id} space={sampleSpace} />);
    await user.click(screen.getByTestId('sidebar-space-title'));
    const input = screen.getByTestId('sidebar-space-title-input');
    expect(input).toHaveAccessibleName('Rename space');
    expect(input).toHaveValue(sampleSpace.name);
    expect(screen.queryByTestId('sidebar-space-title')).not.toBeInTheDocument();
  });

  it('cancels rename on Escape, restoring the title button with its original name', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SpaceHeader spaceId={sampleSpace.id} space={sampleSpace} />);
    await user.click(screen.getByTestId('sidebar-space-title'));
    await user.type(screen.getByTestId('sidebar-space-title-input'), ' edited{Escape}');
    expect(
      screen.queryByTestId('sidebar-space-title-input'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('sidebar-space-title')).toHaveTextContent(
      sampleSpace.name,
    );
  });

  it('leaves rename mode when Enter is pressed', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SpaceHeader spaceId={sampleSpace.id} space={sampleSpace} />);
    await user.click(screen.getByTestId('sidebar-space-title'));
    await user.type(screen.getByTestId('sidebar-space-title-input'), '{Enter}');
    expect(
      screen.queryByTestId('sidebar-space-title-input'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('sidebar-space-title')).toBeInTheDocument();
  });

  it('enters rename mode when Rename is chosen from the space menu', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SpaceHeader spaceId={sampleSpace.id} space={sampleSpace} />);
    await user.click(screen.getByTestId('sidebar-space-menu-trigger'));
    await user.click(await screen.findByTestId('space-menu-popover-rename'));
    expect(
      await screen.findByTestId('sidebar-space-title-input'),
    ).toBeInTheDocument();
  });
});
