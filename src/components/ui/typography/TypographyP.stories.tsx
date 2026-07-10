import type { Meta, StoryObj } from '@storybook/react-vite';
import { TypographyP } from './TypographyP';

const meta = {
  title: 'Typography/P',
  component: TypographyP,
  parameters: { layout: 'padded' },
  args: {
    children:
      'Body copy is set in a relaxed serif to keep long passages comfortable to read.',
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: [
        'body',
        'lead',
        'tagline',
        'description',
        'caption',
        'empty',
        'emptyHint',
      ],
    },
  },
} satisfies Meta<typeof TypographyP>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Body: Story = { args: { variant: 'body' } };
export const Lead: Story = { args: { variant: 'lead' } };
export const Tagline: Story = { args: { variant: 'tagline' } };
export const Description: Story = { args: { variant: 'description' } };
export const Caption: Story = { args: { variant: 'caption' } };
export const Empty: Story = { args: { variant: 'empty', children: 'Nothing here yet' } };
export const EmptyHint: Story = {
  args: { variant: 'emptyHint', children: 'Start by adding a draft' },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-3">
      <TypographyP variant="body">Body</TypographyP>
      <TypographyP variant="lead">Lead</TypographyP>
      <TypographyP variant="tagline">Tagline</TypographyP>
      <TypographyP variant="description">Description</TypographyP>
      <TypographyP variant="caption">Caption</TypographyP>
      <TypographyP variant="empty">Empty</TypographyP>
      <TypographyP variant="emptyHint">Empty hint</TypographyP>
    </div>
  ),
};
