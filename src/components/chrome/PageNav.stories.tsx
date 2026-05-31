import type { Meta, StoryObj } from '@storybook/react-vite';
import { PageNav } from './PageNav';

const meta = {
  title: 'Navigation/PageNav',
  component: PageNav,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof PageNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutBack: Story = {
  args: { showBack: false },
};

export const CustomBackTarget: Story = {
  args: { backTo: '/s/s1' },
};
