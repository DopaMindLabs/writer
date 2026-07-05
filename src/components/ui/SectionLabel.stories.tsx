import type { Meta, StoryObj } from '@storybook/react-vite';
import { SectionLabel } from './SectionLabel';

const meta = {
  title: 'Atoms/SectionLabel',
  component: SectionLabel,
  args: { children: 'Appearance' },
  argTypes: {
    size: { control: 'inline-radio', options: [9, 10] },
    tone: { control: 'inline-radio', options: ['ink3', 'ink4'] },
  },
} satisfies Meta<typeof SectionLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const GroupEyebrow: Story = {
  args: { children: 'More', size: 9, tone: 'ink4' },
};

export const InAGroup: Story = {
  render: () => (
    <div className="w-56 border border-rule bg-paper">
      <SectionLabel className="border-b border-rule px-3.5 pb-2 pt-3">
        Writing
      </SectionLabel>
      <div className="px-3.5 py-2 font-sans text-[13px] text-ink-2">
        Focus mode
      </div>
      <div className="px-3.5 py-2 font-sans text-[13px] text-ink-2">
        Floating toolbar
      </div>
    </div>
  ),
};
