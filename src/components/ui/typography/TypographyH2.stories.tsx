import type { Meta, StoryObj } from '@storybook/react-vite';
import { TypographyH2 } from './TypographyH2';

const meta = {
  title: 'Typography/H2',
  component: TypographyH2,
  parameters: { layout: 'padded' },
  args: { children: 'A section heading' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['default'] },
  },
} satisfies Meta<typeof TypographyH2>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { variant: 'default' } };
