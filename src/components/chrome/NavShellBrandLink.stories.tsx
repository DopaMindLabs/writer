import type { Meta, StoryObj } from '@storybook/react-vite';
import { sampleSpace } from '@/test/fixtures';
import { NavShellBrandLink } from './NavShellBrandLink';

const meta = {
  title: 'Chrome/NavShellBrandLink',
  component: NavShellBrandLink,
  parameters: { layout: 'padded' },
  args: {
    isSpace: false,
    space: null,
  },
} satisfies Meta<typeof NavShellBrandLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Global: Story = {};

export const SpaceScoped: Story = {
  args: {
    isSpace: true,
    space: sampleSpace,
  },
};

export const SpaceLoading: Story = {
  args: {
    isSpace: true,
    space: null,
  },
};
