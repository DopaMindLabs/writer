import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { ComingSoon } from './ComingSoon';

describe('ComingSoon', () => {
  it('marks children as disabled and visually muted', () => {
    renderWithProviders(
      <ComingSoon hint="Find in doc">
        <button type="button">Search</button>
      </ComingSoon>,
    );
    const wrapper = screen.getByText('Search').closest('[data-coming-soon]');
    expect(wrapper).toHaveAttribute('aria-disabled', 'true');
    expect(wrapper).toHaveAttribute('data-coming-soon', 'true');
  });

  it('shows a tooltip with the hint on hover', async () => {
    renderWithProviders(
      <ComingSoon hint="Find in doc">
        <button type="button">Search</button>
      </ComingSoon>,
    );
    await userEvent.hover(
      screen.getByText('Search').closest('[data-coming-soon]')!,
    );
    // Radix renders the tooltip text twice (visible + visually-hidden sr copy);
    // assert at least one match is present.
    const matches = await screen.findAllByText(/Coming soon — Find in doc/);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('omits the badge by default and renders it when showBadge is set', () => {
    const { rerender } = renderWithProviders(
      <ComingSoon>
        <span>thing</span>
      </ComingSoon>,
    );
    expect(screen.queryByTestId('coming-soon-badge')).toBeNull();

    rerender(
      <ComingSoon showBadge>
        <span>thing</span>
      </ComingSoon>,
    );
    expect(screen.getByTestId('coming-soon-badge')).toBeInTheDocument();
  });
});
