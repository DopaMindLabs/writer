import userEvent from '@testing-library/user-event';
import { render, screen } from '@/test/test-utils';
import { NotebookPageThumbnail } from './NotebookPageThumbnail';

const image = new Blob(['page'], { type: 'image/webp' });

describe('NotebookPageThumbnail', () => {
  it('exposes the page number and current page state', () => {
    render(
      <NotebookPageThumbnail
        blob={image}
        pageNumber={2}
        selected
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page');
  });

  it('selects the page from its button', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <NotebookPageThumbnail
        blob={image}
        pageNumber={1}
        selected={false}
        onSelect={onSelect}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Page 1' }));
    expect(onSelect).toHaveBeenCalledOnce();
  });
});
