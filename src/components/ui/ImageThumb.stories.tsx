import type { Meta, StoryObj } from '@storybook/react-vite';
import { ImageThumb } from './ImageThumb';

// A tiny 1×1 transparent PNG, decoded into a Blob for the preview.
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/1eHAAAAAElFTkSuQmCC';

const sampleBlob = (): Blob => {
  const bytes = Uint8Array.from(atob(PNG_BASE64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: 'image/png' });
};

const meta = {
  title: 'Atoms/ImageThumb',
  component: ImageThumb,
  args: { blob: sampleBlob(), name: 'reference.png' },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md'] },
  },
} satisfies Meta<typeof ImageThumb>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Medium: Story = { args: { size: 'md' } };
export const Small: Story = { args: { size: 'sm' } };
export const Removable: Story = {
  args: { size: 'md', onRemove: () => {} },
};
