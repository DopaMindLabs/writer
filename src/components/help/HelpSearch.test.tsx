import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { HelpSearch } from './HelpSearch';

describe('HelpSearch', () => {
  it('shows matching articles as the user types', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HelpSearch />);
    await user.type(screen.getByTestId('help-search'), 'bibtex');
    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: /Citations & bibliography/ }),
      ).toBeInTheDocument();
    });
  });

  it('shows a no-results message when nothing matches', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HelpSearch />);
    await user.type(screen.getByTestId('help-search'), 'zzzznope');
    await waitFor(() => {
      expect(screen.getByText(/zzzznope/)).toBeInTheDocument();
    });
  });
});
