import { describe, it, expect, vi } from 'vitest';
import { act } from '@testing-library/react';
import { renderWithProviders, screen } from '@/test/test-utils';
import { NEXT_RELEASE_AT } from '@/lib/releaseSchedule';
import { ReleaseNoticeBanner } from './ReleaseNoticeBanner';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('ReleaseNoticeBanner', () => {
  it('announces the release date and urges a local sync or backup', () => {
    renderWithProviders(<ReleaseNoticeBanner now={NEXT_RELEASE_AT - 16 * DAY_MS} />);
    const banner = screen.getByTestId('release-notice-banner');
    expect(banner).toHaveTextContent(/23 August, 22:00 CEST/);
    expect(banner).toHaveTextContent(/local sync folder or backup/i);
  });

  it('counts the days remaining, pluralised', () => {
    renderWithProviders(<ReleaseNoticeBanner now={NEXT_RELEASE_AT - 16 * DAY_MS} />);
    expect(screen.getByTestId('release-notice-countdown')).toHaveTextContent(
      '16 days remaining',
    );
  });

  it('reads one day remaining on the eve of the release', () => {
    renderWithProviders(<ReleaseNoticeBanner now={NEXT_RELEASE_AT - 2 * 60 * 60 * 1000} />);
    expect(screen.getByTestId('release-notice-countdown')).toHaveTextContent(
      '1 day remaining',
    );
  });

  it('renders nothing once the release moment has passed', () => {
    renderWithProviders(<ReleaseNoticeBanner now={NEXT_RELEASE_AT} />);
    expect(screen.queryByTestId('release-notice-banner')).toBeNull();
  });

  it('follows the ticking clock while mounted, disappearing when the release passes', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(NEXT_RELEASE_AT - 30_000);
      renderWithProviders(<ReleaseNoticeBanner />);
      expect(screen.getByTestId('release-notice-banner')).toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(61_000);
      });
      expect(screen.queryByTestId('release-notice-banner')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
