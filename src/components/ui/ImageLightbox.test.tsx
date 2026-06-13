import { useState, type ReactNode } from 'react';
import { render, screen, fireEvent } from '@/test/test-utils';
import { ImageLightbox, type LightboxImage } from './ImageLightbox';
import { LightboxContainerContext } from './LightboxContainerContext';

const makeImages = (n: number): LightboxImage[] =>
  Array.from({ length: n }, (_, i) => ({
    blob: new Blob(['x'], { type: 'image/png' }),
    name: `image-${i}.png`,
  }));

const ContainedHarness = ({ children }: { children: ReactNode }) => {
  const [el, setEl] = useState<HTMLElement | null>(null);
  return (
    <LightboxContainerContext.Provider value={el}>
      <div ref={setEl} data-testid="lightbox-pane" className="relative">
        {children}
      </div>
    </LightboxContainerContext.Provider>
  );
};

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

  it('hides the expand toggle when no container is provided', () => {
    render(
      <ImageLightbox
        images={makeImages(1)}
        index={0}
        open
        onOpenChange={() => {}}
      />,
    );
    expect(
      screen.queryByTestId('image-lightbox-expand'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('image-lightbox-shrink'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('image-lightbox')).toHaveAttribute(
      'data-mode',
      'fullscreen',
    );
  });

  it('starts contained and exposes an expand toggle when a container is provided', () => {
    render(
      <ContainedHarness>
        <ImageLightbox
          images={makeImages(1)}
          index={0}
          open
          onOpenChange={() => {}}
        />
      </ContainedHarness>,
    );
    expect(screen.getByTestId('image-lightbox')).toHaveAttribute(
      'data-mode',
      'contained',
    );
    expect(screen.getByTestId('image-lightbox-expand')).toBeInTheDocument();
    expect(
      screen.queryByTestId('image-lightbox-shrink'),
    ).not.toBeInTheDocument();
  });

  it('switches to expanded mode when the expand toggle is clicked', () => {
    render(
      <ContainedHarness>
        <ImageLightbox
          images={makeImages(1)}
          index={0}
          open
          onOpenChange={() => {}}
        />
      </ContainedHarness>,
    );
    fireEvent.click(screen.getByTestId('image-lightbox-expand'));
    expect(screen.getByTestId('image-lightbox')).toHaveAttribute(
      'data-mode',
      'expanded',
    );
    expect(screen.getByTestId('image-lightbox-shrink')).toBeInTheDocument();
    expect(
      screen.queryByTestId('image-lightbox-expand'),
    ).not.toBeInTheDocument();
  });

  it('restores to contained mode when the shrink toggle is clicked', () => {
    render(
      <ContainedHarness>
        <ImageLightbox
          images={makeImages(1)}
          index={0}
          open
          onOpenChange={() => {}}
        />
      </ContainedHarness>,
    );
    fireEvent.click(screen.getByTestId('image-lightbox-expand'));
    fireEvent.click(screen.getByTestId('image-lightbox-shrink'));
    expect(screen.getByTestId('image-lightbox')).toHaveAttribute(
      'data-mode',
      'contained',
    );
  });

  it('resets to contained mode the next time it opens', () => {
    const Harness = () => {
      const [open, setOpen] = useState(true);
      return (
        <ContainedHarness>
          <button
            type="button"
            data-testid="reopen"
            onClick={() => { setOpen(true); }}
          >
            reopen
          </button>
          <ImageLightbox
            images={makeImages(1)}
            index={0}
            open={open}
            onOpenChange={setOpen}
          />
        </ContainedHarness>
      );
    };
    render(<Harness />);
    fireEvent.click(screen.getByTestId('image-lightbox-expand'));
    expect(screen.getByTestId('image-lightbox')).toHaveAttribute(
      'data-mode',
      'expanded',
    );
    fireEvent.click(screen.getByTestId('image-lightbox-close'));
    fireEvent.click(screen.getByTestId('reopen'));
    expect(screen.getByTestId('image-lightbox')).toHaveAttribute(
      'data-mode',
      'contained',
    );
  });

  it('portals into the container while contained and to body once expanded', () => {
    render(
      <ContainedHarness>
        <ImageLightbox
          images={makeImages(1)}
          index={0}
          open
          onOpenChange={() => {}}
        />
      </ContainedHarness>,
    );
    const pane = screen.getByTestId('lightbox-pane');
    expect(pane.contains(screen.getByTestId('image-lightbox'))).toBe(true);
    fireEvent.click(screen.getByTestId('image-lightbox-expand'));
    expect(pane.contains(screen.getByTestId('image-lightbox'))).toBe(false);
  });
});
