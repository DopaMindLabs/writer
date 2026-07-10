import type { Meta, StoryObj } from '@storybook/react-vite';
import { TypographyMuted } from './TypographyMuted';

const meta = {
  title: 'Typography/Muted',
  component: TypographyMuted,
  parameters: { layout: 'padded' },
  args: { children: 'Last saved a few seconds ago.' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['default', 'xs'] },
  },
} satisfies Meta<typeof TypographyMuted>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { variant: 'default' } };
export const Xs: Story = { args: { variant: 'xs' } };

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <TypographyMuted variant="default">Default muted</TypographyMuted>
      <TypographyMuted variant="xs">Xs muted</TypographyMuted>
    </div>
  ),
};
