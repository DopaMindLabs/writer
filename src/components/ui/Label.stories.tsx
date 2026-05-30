import type { Meta, StoryObj } from '@storybook/react-vite';
import { Label } from './Label';

const meta = {
  title: 'Forms/Label',
  component: Label,
  args: { children: 'Document name' },
  argTypes: {
    tone: { control: 'inline-radio', options: ['ink', 'ink2', 'ink3'] },
    weight: { control: 'inline-radio', options: ['regular', 'medium'] },
  },
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Regular: Story = { args: { weight: 'regular' } };
export const Ink2: Story = { args: { tone: 'ink2' } };
export const Ink3: Story = { args: { tone: 'ink3' } };

export const Matrix: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      {(['ink', 'ink2', 'ink3'] as const).map((tone) =>
        (['regular', 'medium'] as const).map((weight) => (
          <Label key={`${tone}-${weight}`} tone={tone} weight={weight}>
            {tone} · {weight}
          </Label>
        )),
      )}
    </div>
  ),
};
