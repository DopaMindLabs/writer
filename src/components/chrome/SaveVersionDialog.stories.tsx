import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useUI } from '@/store/ui';
import { SaveVersionDialog } from './SaveVersionDialog';

const OpenDialog = () => {
  const setOpen = useUI((s) => s.setSaveVersionOpen);
  useEffect(() => {
    setOpen(true);
    return () => { setOpen(false); };
  }, [setOpen]);
  return <SaveVersionDialog docId="d1" />;
};

const meta = {
  tags: ['!autodocs'],
  title: 'Overlays/SaveVersionDialog',
  component: SaveVersionDialog,
  parameters: { layout: 'fullscreen', seed: 'docWithRevisions' },
} satisfies Meta<typeof SaveVersionDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  render: () => <OpenDialog />,
};
