import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { ComingSoonBadge } from './ComingSoonBadge';

describe('ComingSoonBadge', () => {
  it('renders the "coming soon" pill', () => {
    renderWithProviders(<ComingSoonBadge />);
    const badge = screen.getByTestId('coming-soon-badge');
    expect(badge).toHaveTextContent(/^coming soon$/);
    expect(badge.className).toMatch(/bg-paper-2/);
  });

  it('merges custom className', () => {
    renderWithProviders(<ComingSoonBadge className="ml-2" />);
    expect(screen.getByTestId('coming-soon-badge').className).toMatch(/ml-2/);
  });

  describe('snapshot', () => {
    it('should match the snapshot for default and custom-class variants', () => {
      const { container } = renderWithProviders(
        <div>
          <ComingSoonBadge />
          <ComingSoonBadge className="px-2 py-1 text-[10px]" />
        </div>,
      );
      expect(container).toMatchSnapshot();
    });
  });
});
