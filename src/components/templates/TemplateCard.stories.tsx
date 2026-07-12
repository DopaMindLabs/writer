import type { Meta, StoryObj } from '@storybook/react-vite';
import { getTemplate } from '@/data/templates';
import { TemplateCard } from './TemplateCard';

const blank = getTemplate('blank')!;
const noop = () => {};

const meta = {
  tags: ['!autodocs'],
  title: 'Templates/TemplateCard',
  component: TemplateCard,
  args: { tpl: blank, index: 0, active: false, label: 'Blank', onSelect: noop },
} satisfies Meta<typeof TemplateCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Active: Story = { args: { active: true } };
export const WithDescription: Story = { args: { description: 'Start from an empty space' } };
