import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { SyncUnsupportedNotice } from './SyncUnsupportedNotice';

describe('SyncUnsupportedNotice', () => {
  it('renders the unsupported caption', () => {
    renderWithProviders(<SyncUnsupportedNotice />);
    expect(screen.getByText(/folder sync needs/i)).toBeInTheDocument();
  });

  it('explains the manual feature flag with a warning of the implications', () => {
    renderWithProviders(<SyncUnsupportedNotice />);
    const banner = screen.getByRole('status');
    expect(banner).toHaveTextContent(/brave:\/\/flags\/#file-system-access-api/i);
    expect(banner).toHaveTextContent(/privacy and security precaution/i);
  });

  it('shows the title heading only when withTitle is set', () => {
    const { unmount } = renderWithProviders(<SyncUnsupportedNotice withTitle />);
    expect(
      screen.getByRole('heading', { name: /not available in this browser/i }),
    ).toBeInTheDocument();
    unmount();

    renderWithProviders(<SyncUnsupportedNotice />);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  describe('snapshot', () => {
    it('should match the snapshot with the title', () => {
      const { container } = renderWithProviders(
        <SyncUnsupportedNotice withTitle />,
      );
      expect(container).toMatchSnapshot();
    });
  });
});
