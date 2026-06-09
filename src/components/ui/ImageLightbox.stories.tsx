import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ImageLightbox, type LightboxImage } from './ImageLightbox';
import { Button } from './Button';

// A tiny 1×1 transparent PNG, decoded into a Blob for the preview.
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/1eHAAAAAElFTkSuQmCC';

const sampleImages = (n: number): LightboxImage[] =>
  Array.from({ length: n }, (_, i) => {
    const bytes = Uint8Array.from(atob(PNG_BASE64), (c) => c.charCodeAt(0));
    return { blob: new Blob([bytes], { type: 'image/png' }), name: `image-${i}.png` };
  });

const meta = {
  title: 'Molecules/ImageLightbox',
  component: ImageLightbox,
  args: {
    images: [],
    index: 0,
    open: false,
    onOpenChange: () => undefined,
  },
} satisfies Meta<typeof ImageLightbox>;

export default meta;
type Story = StoryObj<typeof meta>;

const Demo = ({ count }: { count: number }) => {
  const [index, setIndex] = useState<number | null>(null);
  const images = sampleImages(count);
  return (
    <>
      <Button onClick={() => { setIndex(0); }}>Open viewer</Button>
      <ImageLightbox
        images={images}
        index={index ?? 0}
        open={index !== null}
        onOpenChange={(o) => { if (!o) setIndex(null); }}
        onIndexChange={setIndex}
      />
    </>
  );
};

export const Single: Story = {
  render: () => <Demo count={1} />,
};

export const Multiple: Story = {
  render: () => <Demo count={3} />,
};
