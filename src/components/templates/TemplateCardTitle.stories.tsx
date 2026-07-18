import type { Meta, StoryObj } from '@storybook/react-vite';
import { getTemplate } from '@/data/templates';
import { TemplateStage } from '@/data/templates/types';
import { TemplateCardTitle } from './TemplateCardTitle';

const blank = getTemplate('blank')!;

const meta = {
  tags: ['!autodocs'],
  title: 'Templates/TemplateCardTitle',
  component: TemplateCardTitle,
  args: { tpl: blank, label: 'Blank', description: 'Start from an empty space' },
} satisfies Meta<typeof TemplateCardTitle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithStageChip: Story = {};
export const Stable: Story = { args: { tpl: { ...blank, stage: TemplateStage.Stable } } };
export const WithoutDescription: Story = { args: { description: undefined } };
