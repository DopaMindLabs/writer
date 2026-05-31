import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConfirmDialog } from './ConfirmDialog';
import { Button } from '@/components/ui/Button';

const meta = {
  title: 'Overlays/ConfirmDialog',
  component: ConfirmDialog,
  parameters: { layout: 'centered' },
  tags: ['!autodocs'],
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const Demo = ({ confirmKind }: { confirmKind?: 'primary' | 'dangerous' }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => { setOpen(true); }}>
        Open confirm
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Restore this version?"
        description="Your current text is saved as a version first, so you can undo this."
        confirmLabel="Restore"
        cancelLabel="Cancel"
        confirmKind={confirmKind}
        onConfirm={() => undefined}
      />
    </>
  );
};

export const Default: Story = {
  args: {
    open: false,
    onOpenChange: () => undefined,
    title: '',
    confirmLabel: '',
    cancelLabel: '',
    onConfirm: () => undefined,
  },
  render: () => <Demo />,
};

export const Destructive: Story = {
  args: { ...Default.args },
  render: () => <Demo confirmKind="dangerous" />,
};
