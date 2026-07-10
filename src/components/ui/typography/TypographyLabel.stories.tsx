import type { Meta, StoryObj } from '@storybook/react-vite';
import { TypographyLabel } from './TypographyLabel';

const meta = {
  title: 'Typography/Label',
  component: TypographyLabel,
  parameters: { layout: 'padded' },
  args: { children: 'Reading width' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['default', 'wide', 'xs'] },
    asChild: { control: 'boolean' },
  },
} satisfies Meta<typeof TypographyLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { variant: 'default' } };
export const Wide: Story = { args: { variant: 'wide' } };
export const Xs: Story = { args: { variant: 'xs' } };

export const AsChild: Story = {
  render: () => (
    <TypographyLabel asChild>
      <h3>Rendered as a heading</h3>
    </TypographyLabel>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <TypographyLabel variant="default">Default</TypographyLabel>
      <TypographyLabel variant="wide">Wide</TypographyLabel>
      <TypographyLabel variant="xs">Xs</TypographyLabel>
    </div>
  ),
};
