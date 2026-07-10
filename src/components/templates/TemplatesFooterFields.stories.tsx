import type { Meta, StoryObj } from '@storybook/react-vite';
import { TemplatesFooterFields } from './TemplatesFooterFields';

const noop = () => {};

const meta = {
  tags: ['!autodocs'],
  title: 'Templates/TemplatesFooterFields',
  component: TemplatesFooterFields,
  args: { name: 'My space', tag: 'MS', onNameChange: noop, onTagChange: noop },
} satisfies Meta<typeof TemplatesFooterFields>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { name: '', tag: '' } };
