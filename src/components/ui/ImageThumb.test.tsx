import userEvent from '@testing-library/user-event';
import { render, screen } from '@/test/test-utils';
import { ImageThumb } from './ImageThumb';

const makeBlob = (): Blob => new Blob(['x'], { type: 'image/png' });

describe('ImageThumb', () => {
  it('renders an image with the name as alt text', () => {
    render(<ImageThumb blob={makeBlob()} name="diagram.png" />);
    const img = screen.getByRole('img', { name: 'diagram.png' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', expect.stringContaining('blob:'));
  });

  it('omits the remove control unless onRemove is provided', () => {
    render(<ImageThumb blob={makeBlob()} name="a.png" />);
    expect(
      screen.queryByRole('button', { name: /Remove/ }),
    ).not.toBeInTheDocument();
  });

  it('fires onRemove when the remove control is clicked', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<ImageThumb blob={makeBlob()} name="a.png" onRemove={onRemove} />);
    await user.click(screen.getByRole('button', { name: 'Remove a.png' }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it('applies the small size variant', () => {
    const { container } = render(
      <ImageThumb blob={makeBlob()} name="a.png" size="sm" />,
    );
    expect(container.firstChild).toHaveClass('h-12', 'w-12');
  });
});
