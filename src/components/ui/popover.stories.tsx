import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from './popover';
import { Button } from './Button';

const meta = {
  title: 'Overlays/Popover',
  component: Popover,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const Stateful = () => {
      const [open, setOpen] = useState(false);
      return (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button kind="secondary" size="sm">
              Open popover
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
              Reading width
            </p>
            <p className="mt-2 text-sm text-ink-2">
              Adjust how wide the text column renders.
            </p>
            <div className="mt-3 flex justify-end">
              <PopoverClose asChild>
                <Button kind="ghost" size="sm">
                  Close
                </Button>
              </PopoverClose>
            </div>
          </PopoverContent>
        </Popover>
      );
    };
    return <Stateful />;
  },
};

export const OpenByDefault: Story = {
  render: () => {
    const Stateful = () => {
      const [open, setOpen] = useState(true);
      return (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button kind="secondary" size="sm">
              Open popover
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-4">
            <p className="text-sm text-ink-2">
              This popover is open by default.
            </p>
          </PopoverContent>
        </Popover>
      );
    };
    return <Stateful />;
  },
};
