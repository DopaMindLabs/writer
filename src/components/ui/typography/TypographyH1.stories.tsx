import type { Meta, StoryObj } from '@storybook/react-vite';
import { TypographyH1 } from './TypographyH1';

const meta = {
  title: 'Typography/H1',
  component: TypographyH1,
  parameters: { layout: 'padded' },
  args: { children: 'The quick brown fox' },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['display', 'page', 'section', 'compact', 'simple'],
    },
  },
} satisfies Meta<typeof TypographyH1>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Display: Story = { args: { variant: 'display' } };
export const Page: Story = { args: { variant: 'page' } };
export const Section: Story = { args: { variant: 'section' } };
export const Compact: Story = { args: { variant: 'compact' } };
export const Simple: Story = { args: { variant: 'simple' } };

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <TypographyH1 variant="display">Display</TypographyH1>
      <TypographyH1 variant="page">Page</TypographyH1>
      <TypographyH1 variant="section">Section</TypographyH1>
      <TypographyH1 variant="compact">Compact</TypographyH1>
      <TypographyH1 variant="simple">Simple</TypographyH1>
    </div>
  ),
};
