import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import type { MediaItem } from '@/db/schema';
import { MediaList } from './MediaList';

const item = (id: string, name: string): MediaItem => ({
  id,
  spaceId: 's1',
  name,
  mime: 'application/pdf',
  size: 1,
  blob: new Blob(['%PDF']),
  pageCount: 1,
  createdAt: 0,
  updatedAt: 0,
});

describe('MediaList', () => {
  it('renders a row per item', () => {
    renderWithProviders(
      <MediaList
        items={[item('a', 'a.pdf'), item('b', 'b.pdf')]}
        selectedId="a"
        onSelect={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByTestId('media-row-a')).toBeInTheDocument();
    expect(screen.getByTestId('media-row-b')).toBeInTheDocument();
  });
});
