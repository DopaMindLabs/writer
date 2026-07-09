import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { MediaFilterTabs } from './MediaFilterTabs';

describe('MediaFilterTabs', () => {
  it('marks the active tab and switches on click', async () => {
    const onChange = vi.fn();
    renderWithProviders(<MediaFilterTabs value="all" onChange={onChange} />);
    expect(screen.getByTestId('media-library-filter-all')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await userEvent.click(screen.getByTestId('media-library-filter-annotated'));
    expect(onChange).toHaveBeenCalledWith('annotated');
  });

  it('leaves the cited tab disabled and shows why on hover', async () => {
    renderWithProviders(<MediaFilterTabs value="all" onChange={vi.fn()} />);
    const cited = screen.getByTestId('media-library-filter-cited');
    expect(cited).toHaveAttribute('aria-disabled', 'true');
    await userEvent.hover(cited);
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Needs citation links — not available yet.',
    );
  });
});
