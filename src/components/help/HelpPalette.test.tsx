import { describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { HelpPalette } from './HelpPalette';
import { useHelp } from '@/store/help';

describe('HelpPalette', () => {
  beforeEach(() => {
    useHelp.setState({ open: false });
  });

  it('is not rendered while closed', () => {
    renderWithProviders(<HelpPalette />);
    expect(screen.queryByTestId('help-palette')).not.toBeInTheDocument();
  });

  it('shows the shortcuts reference when opened with an empty query', () => {
    useHelp.setState({ open: true });
    renderWithProviders(<HelpPalette />);
    expect(screen.getByTestId('help-palette')).toBeInTheDocument();
    expect(screen.getByText('Keyboard shortcuts')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Open full Help Center/ }),
    ).toBeInTheDocument();
  });

  it('searches and closes after picking a result', async () => {
    useHelp.setState({ open: true });
    const user = userEvent.setup();
    renderWithProviders(<HelpPalette />);

    await user.type(screen.getByTestId('help-palette-search'), 'bibtex');
    const result = await screen.findByRole('link', {
      name: /Citations & bibliography/,
    });
    await user.click(result);

    await waitFor(() => {
      expect(useHelp.getState().open).toBe(false);
    });
  });
});
