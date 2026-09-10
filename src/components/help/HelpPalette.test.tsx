import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { HelpPalette } from './HelpPalette';
import { useHelp } from '@/store/help';
import * as platform from '@/lib/shortcuts/platform';

describe('HelpPalette', () => {
  beforeEach(() => {
    useHelp.setState({ open: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  it('shows Ctrl chords off Apple platforms instead of a fixed ⌘ glyph', () => {
    vi.spyOn(platform, 'isApplePlatform').mockReturnValue(false);
    useHelp.setState({ open: true });
    renderWithProviders(<HelpPalette />);
    expect(screen.getByText('Ctrl+K')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+\\')).toBeInTheDocument();
    expect(screen.queryByText(/⌘/)).not.toBeInTheDocument();
  });

  it('shows the Command glyphs on Apple platforms', () => {
    vi.spyOn(platform, 'isApplePlatform').mockReturnValue(true);
    useHelp.setState({ open: true });
    renderWithProviders(<HelpPalette />);
    expect(screen.getByText('⌘K')).toBeInTheDocument();
    expect(screen.getByText('⌘\\')).toBeInTheDocument();
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
