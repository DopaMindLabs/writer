import type { Meta, StoryObj } from '@storybook/react-vite';
import { Eyebrow } from './Eyebrow';

const meta = {
  title: 'Atoms/Eyebrow',
  component: Eyebrow,
  args: { children: 'filed · serial fiction' },
  argTypes: {
    size: { control: 'inline-radio', options: [9, 10, 11] },
    tone: {
      control: 'inline-radio',
      options: ['ink', 'ink2', 'ink3', 'ink4', 'inherit'],
    },
  },
} satisfies Meta<typeof Eyebrow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Small: Story = { args: { size: 9, children: 'ch. 7 of 14' } };
export const Large: Story = { args: { size: 11, children: 'editor · notes' } };
export const Ink2: Story = { args: { tone: 'ink2', children: 'strong tone' } };
export const Ink4: Story = { args: { tone: 'ink4', children: 'micro-meta' } };
export const Ink: Story = { args: { tone: 'ink', children: 'full strength' } };

/** `inherit` names no colour, so the surrounding element owns it. */
export const InheritsParentColour: Story = {
  render: () => (
    <div className="text-danger">
      <Eyebrow tone="inherit">owned by the parent</Eyebrow>
    </div>
  ),
};

export const AsChildHeaderCell: Story = {
  render: () => (
    <table className="border-collapse">
      <thead>
        <tr className="border-b border-rule">
          <Eyebrow asChild size={9}>
            <th className="py-2 pr-6 text-left font-normal">when</th>
          </Eyebrow>
          <Eyebrow asChild size={9}>
            <th className="py-2 text-left font-normal">status</th>
          </Eyebrow>
        </tr>
      </thead>
    </table>
  ),
};

export const Matrix: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-6">
      {([9, 10, 11] as const).map((s) =>
        (['ink', 'ink2', 'ink3', 'ink4'] as const).map((t) => (
          <Eyebrow key={`${String(s)}-${t}`} size={s} tone={t}>
            {s} · {t}
          </Eyebrow>
        )),
      )}
    </div>
  ),
};
