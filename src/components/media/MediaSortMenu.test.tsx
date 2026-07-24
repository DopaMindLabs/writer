import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { MediaSortMenu } from './MediaSortMenu';

describe('MediaSortMenu', () => {
  it('shows the current order in the trigger', () => {
    renderWithProviders(<MediaSortMenu value="recent" onChange={vi.fn()} />);
    expect(screen.getByTestId('media-library-sort')).toHaveTextContent('Sort: Recent');
  });

  it('changes the order from the menu', async () => {
    const onChange = vi.fn();
    renderWithProviders(<MediaSortMenu value="recent" onChange={onChange} />);
    await userEvent.click(screen.getByTestId('media-library-sort'));
    await userEvent.click(await screen.findByTestId('media-library-sort-pages'));
    expect(onChange).toHaveBeenCalledWith('pages');
  });
});
