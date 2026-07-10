import type { Meta, StoryObj } from '@storybook/react-vite';
import { ImagePlus } from '@/components/libs/icons';
import { Button } from './Button';
import { Icon } from './icon';
import { FileInputTrigger } from './FileInputTrigger';

const meta = {
  title: 'Atoms/FileInputTrigger',
  component: FileInputTrigger,
} satisfies Meta<typeof FileInputTrigger>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithSecondaryButton: Story = {
  args: {
    accept: 'image/*',
    multiple: true,
    onPick: () => {},
    children: (open: () => void) => (
      <Button kind="secondary" size="sm" onClick={open} className="gap-1.5">
        <Icon icon={ImagePlus} size="sm" />
        Add picture
      </Button>
    ),
  },
};

export const Disabled: Story = {
  args: {
    accept: 'image/*',
    disabled: true,
    onPick: () => {},
    children: (open: () => void) => (
      <Button kind="secondary" size="sm" disabled onClick={open}>
        Add picture
      </Button>
    ),
  },
};
