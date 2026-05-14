import { renderWithProviders, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { ComingSoonRow } from './ComingSoonRow';

describe('ComingSoonRow', () => {
  it('renders label, disabled checkbox, help button, and badge', () => {
    renderWithProviders(
      <ComingSoonRow label="Sync" hint="cloud sync" tooltip="Coming later" />,
    );
    expect(screen.getByText('Sync')).toBeInTheDocument();
    expect(screen.getByText('cloud sync')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: /what is this/i })).toBeInTheDocument();
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });

  it('shows tooltip content on hover of help button', async () => {
    renderWithProviders(
      <ComingSoonRow label="Sync" tooltip="Coming soon: cloud sync" />,
    );
    const helpBtn = screen.getByRole('button', { name: /what is this/i });
    await userEvent.hover(helpBtn);
    expect(
      await screen.findByRole('tooltip'),
    ).toHaveTextContent('Coming soon: cloud sync');
  });
});
