import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@/components/ui/Button';
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

export const WithActions: Story = {
  args: {
    showBack: false,
    actions: (
      <Button kind="secondary" size="sm">
        Sign in to sync
      </Button>
    ),
  },
};
