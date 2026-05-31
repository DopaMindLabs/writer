import { render, screen, fireEvent } from '@/test/test-utils';
import { ImageLightbox, type LightboxImage } from './ImageLightbox';

const makeImages = (n: number): LightboxImage[] =>
  Array.from({ length: n }, (_, i) => ({
    blob: new Blob(['x'], { type: 'image/png' }),
    name: `image-${i}.png`,
  }));

describe('ImageLightbox', () => {
  it('renders the current image full size when open', () => {
    render(
      <ImageLightbox
        images={makeImages(1)}
        index={0}
        open
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByTestId('image-lightbox-image')).toHaveAttribute(
      'alt',
      'image-0.png',
    );
  });

  it('exposes a dialog labelled by the image name', () => {
    render(
      <ImageLightbox
        images={makeImages(1)}
        index={0}
        open
        onOpenChange={() => {}}
      />,
    );
    const dialog = screen.getByRole('dialog');
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    expect(document.getElementById(labelledBy!)).toHaveTextContent('image-0.png');
  });

  it('does not render the image when closed', () => {
    render(
      <ImageLightbox
        images={makeImages(1)}
        index={0}
        open={false}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.queryByTestId('image-lightbox-image')).not.toBeInTheDocument();
  });

  it('calls onOpenChange(false) when the close control is clicked', () => {
    const onOpenChange = vi.fn();
    render(
      <ImageLightbox
        images={makeImages(1)}
        index={0}
        open
        onOpenChange={onOpenChange}
      />,
    );
    fireEvent.click(screen.getByTestId('image-lightbox-close'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('pages to the next and previous image with the on-screen controls', () => {
    const onIndexChange = vi.fn();
    render(
      <ImageLightbox
        images={makeImages(3)}
        index={1}
        open
        onOpenChange={() => {}}
        onIndexChange={onIndexChange}
      />,
    );
    fireEvent.click(screen.getByTestId('image-lightbox-next'));
    expect(onIndexChange).toHaveBeenLastCalledWith(2);
    fireEvent.click(screen.getByTestId('image-lightbox-prev'));
    expect(onIndexChange).toHaveBeenLastCalledWith(0);
    expect(screen.getByTestId('image-lightbox-counter')).toHaveTextContent('2 / 3');
  });

  it('wraps around when paging past the ends', () => {
    const onIndexChange = vi.fn();
    render(
      <ImageLightbox
        images={makeImages(2)}
        index={0}
        open
        onOpenChange={() => {}}
        onIndexChange={onIndexChange}
      />,
    );
    fireEvent.click(screen.getByTestId('image-lightbox-prev'));
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
  });

  it('hides paging controls for a single image', () => {
    render(
      <ImageLightbox
        images={makeImages(1)}
        index={0}
        open
        onOpenChange={() => {}}
        onIndexChange={() => {}}
      />,
    );
    expect(screen.queryByTestId('image-lightbox-next')).not.toBeInTheDocument();
    expect(screen.queryByTestId('image-lightbox-prev')).not.toBeInTheDocument();
  });
});
