import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { MediaListSearch } from './MediaListSearch';

describe('MediaListSearch', () => {
  it('reports typed queries and clears', () => {
    const onChange = vi.fn();
    renderWithProviders(<MediaListSearch query="paper" onChange={onChange} />);
    fireEvent.change(screen.getByTestId('media-search'), {
      target: { value: 'arxiv' },
    });
    expect(onChange).toHaveBeenCalledWith('arxiv');

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(onChange).toHaveBeenCalledWith('');
  });
});
