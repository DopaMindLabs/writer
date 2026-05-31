import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';
import { Button } from './Button';

const meta = {
  title: 'Overlays/Dialog',
  component: Dialog,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const Stateful = () => {
      const [open, setOpen] = useState(false);
      return (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Open dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Discard draft?</DialogTitle>
              <DialogDescription>
                This will permanently remove the unsynced changes.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button kind="ghost" size="sm">
                  Cancel
                </Button>
              </DialogClose>
              <DialogClose asChild>
                <Button kind="dangerous" size="sm">
                  Discard
                </Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Open dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Settings saved</DialogTitle>
              <DialogDescription>
                Your preferences will apply on the next sync.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end">
              <DialogClose asChild>
                <Button size="sm">Done</Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      );
    };
    return <Stateful />;
  },
};
