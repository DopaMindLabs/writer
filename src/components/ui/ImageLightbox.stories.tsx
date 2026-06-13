import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ImageLightbox, type LightboxImage } from './ImageLightbox';
import { LightboxContainerContext } from './LightboxContainerContext';
import { Button } from './Button';

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

const ContainedDemo = () => {
  const [index, setIndex] = useState<number | null>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const images = sampleImages(2);
  return (
    <LightboxContainerContext.Provider value={container}>
      <div
        ref={setContainer}
        className="relative h-[420px] w-[640px] border border-rule bg-paper p-4"
      >
        <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-ink-3">
          Pane that owns the lightbox
        </p>
        <Button onClick={() => { setIndex(0); }}>Open viewer</Button>
        <ImageLightbox
          images={images}
          index={index ?? 0}
          open={index !== null}
          onOpenChange={(o) => { if (!o) setIndex(null); }}
          onIndexChange={setIndex}
        />
      </div>
    </LightboxContainerContext.Provider>
  );
};

export const Contained: Story = {
  render: () => <ContainedDemo />,
};
