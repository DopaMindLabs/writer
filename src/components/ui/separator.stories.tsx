import type { Meta, StoryObj } from '@storybook/react-vite';
import { Separator } from './separator';

const meta = {
  title: 'Atoms/Separator',
  component: Separator,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <div className="w-80">
      <div className="pb-2 font-mono text-[10px] uppercase tracking-wider text-ink-3">
        above
      </div>
      <Separator />
      <div className="pt-2 font-mono text-[10px] uppercase tracking-wider text-ink-3">
        below
      </div>
    </div>
  ),
};

export const HorizontalLight: Story = {
  render: () => (
    <div className="w-80 bg-paper-2 p-4">
      <div className="pb-2 font-mono text-[10px] uppercase tracking-wider text-ink-3">
        above (on tint ground)
      </div>
      <Separator light />
      <div className="pt-2 font-mono text-[10px] uppercase tracking-wider text-ink-3">
        below
      </div>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex h-16 items-center gap-4">
      <span>left</span>
      <Separator orientation="vertical" />
      <span>right</span>
    </div>
  ),
};

export const VerticalLight: Story = {
  render: () => (
    <div className="flex h-16 items-center gap-4 bg-paper-2 p-4">
      <span>left</span>
      <Separator orientation="vertical" light />
      <span>right</span>
    </div>
  ),
};

export const Matrix: Story = {
  render: () => (
    <div className="grid w-96 grid-cols-2 gap-6">
      <div>
        <div className="pb-2 font-mono text-[10px] uppercase tracking-wider text-ink-3">
          default
        </div>
        <Separator />
      </div>
      <div>
        <div className="pb-2 font-mono text-[10px] uppercase tracking-wider text-ink-3">
          light
        </div>
        <Separator light />
      </div>
    </div>
  ),
};
