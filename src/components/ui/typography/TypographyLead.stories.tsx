import type { Meta, StoryObj } from '@storybook/react-vite';
import { TypographyLead } from './TypographyLead';

const meta = {
  title: 'Typography/Lead',
  component: TypographyLead,
  parameters: { layout: 'padded' },
  args: {
    children:
      'A lead paragraph introduces the piece with slightly larger, relaxed serif text.',
  },
} satisfies Meta<typeof TypographyLead>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => <TypographyLead {...args} className="max-w-md" />,
};
