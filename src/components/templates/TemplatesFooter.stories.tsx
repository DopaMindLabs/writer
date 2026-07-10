import type { Meta, StoryObj } from '@storybook/react-vite';
import { TemplatesFooter } from './TemplatesFooter';

const noop = () => {};

const meta = {
  tags: ['!autodocs'],
  title: 'Templates/TemplatesFooter',
  component: TemplatesFooter,
  args: {
    name: 'My space',
    tag: 'MS',
    submitting: false,
    canSubmit: true,
    submitLabel: 'Enter Blank',
    onNameChange: noop,
    onTagChange: noop,
  },
} satisfies Meta<typeof TemplatesFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const CannotSubmit: Story = { args: { canSubmit: false } };
