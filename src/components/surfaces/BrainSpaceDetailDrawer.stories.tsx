import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useUI } from '@/store/ui';
import { BrainSpaceDetailDrawer } from './BrainSpaceDetailDrawer';

const OpenForNote = ({
  spaceId,
  noteId,
}: {
  spaceId: string;
  noteId: string;
}) => {
  const openDetail = useUI((s) => s.openDetail);
  const closeDetail = useUI((s) => s.closeDetail);
  useEffect(() => {
    openDetail(noteId);
    return () => { closeDetail(); };
  }, [openDetail, closeDetail, noteId]);
  return <BrainSpaceDetailDrawer spaceId={spaceId} />;
};

const meta = {
  tags: ['!autodocs'],
  title: 'Surfaces/BrainSpaceDetailDrawer',
  component: BrainSpaceDetailDrawer,
  parameters: { layout: 'fullscreen', seed: 'brainSpace' },
  args: { spaceId: 's1' },
} satisfies Meta<typeof BrainSpaceDetailDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithConnection: Story = {
  render: () => <OpenForNote spaceId="s1" noteId="n2" />,
};

export const FromNote: Story = {
  render: () => <OpenForNote spaceId="s1" noteId="n1" />,
};

export const Closed: Story = {};
