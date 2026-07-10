import type { Meta, StoryObj } from '@storybook/react-vite';
import { TemplatesHeader } from './TemplatesHeader';

const meta = {
  tags: ['!autodocs'],
  title: 'Templates/TemplatesHeader',
  component: TemplatesHeader,
} satisfies Meta<typeof TemplatesHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
