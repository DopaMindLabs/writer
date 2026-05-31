import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';
import { Button } from './Button';

const meta = {
  title: 'Overlays/Tooltip',
  component: Tooltip,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const Stateful = () => {
      const [open, setOpen] = useState(false);
      return (
        <TooltipProvider delayDuration={0}>
          <Tooltip open={open} onOpenChange={setOpen}>
            <TooltipTrigger asChild>
              <Button kind="secondary" size="sm">
                Hover me
              </Button>
            </TooltipTrigger>
            <TooltipContent>Saved 2 minutes ago</TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
        <TooltipProvider delayDuration={0}>
          <Tooltip open={open} onOpenChange={setOpen}>
            <TooltipTrigger asChild>
              <Button kind="secondary" size="sm">
                Hover me
              </Button>
            </TooltipTrigger>
            <TooltipContent sideOffset={8}>Always visible label</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    };
    return <Stateful />;
  },
};
