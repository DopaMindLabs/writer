import type { Meta, StoryObj } from '@storybook/react-vite';
import { sampleSpace } from '@/test/fixtures';
import { NavShellHeader } from './NavShellHeader';

const meta = {
  title: 'Chrome/NavShellHeader',
  component: NavShellHeader,
  parameters: { layout: 'padded' },
  args: {
    variant: 'global',
    space: null,
  },
} satisfies Meta<typeof NavShellHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Global: Story = {};

export const SpaceScoped: Story = {
  args: {
    variant: 'space',
    space: sampleSpace,
  },
};

export const HelpOverride: Story = {
  args: {
    variant: 'global',
    space: null,
    subtitleOverride: 'Help / Documentation',
  },
};
