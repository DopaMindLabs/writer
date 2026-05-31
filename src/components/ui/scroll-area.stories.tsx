import type { Meta, StoryObj } from '@storybook/react-vite';
import { ScrollArea } from './scroll-area';

const meta = {
  title: 'Atoms/ScrollArea',
  component: ScrollArea,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof ScrollArea>;

export default meta;
type Story = StoryObj<typeof meta>;

const lines = Array.from({ length: 40 }, (_, i) => `Line ${String(i + 1)}`);

export const Vertical: Story = {
  render: () => (
    <ScrollArea className="h-48 w-64 border border-rule">
      <div className="p-3">
        {lines.map((line) => (
          <div key={line} className="py-1 text-sm text-ink-2">
            {line}
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <ScrollArea className="w-64 border border-rule">
      <div className="flex gap-3 p-3">
        {lines.map((line) => (
          <div
            key={line}
            className="whitespace-nowrap text-sm text-ink-2"
          >
            {line}
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
};
