import type { Meta, StoryObj } from '@storybook/react-vite';
import { listTemplates, type Template } from '@/data/templates';
import { TemplatesBody } from './TemplatesBody';

const noop = () => {};

const meta = {
  tags: ['!autodocs'],
  title: 'Templates/TemplatesBody',
  component: TemplatesBody,
  args: {
    templates: listTemplates(),
    selectedId: 'blank',
    templateLabel: (tpl: Template) => tpl.label,
    templateDescription: (tpl: Template) => tpl.description,
    onSelect: noop,
  },
} satisfies Meta<typeof TemplatesBody>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
