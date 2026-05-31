import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useUI } from '@/store/ui';
import { BrainSpaceDetailDrawer } from './BrainSpaceDetailDrawer';

// The drawer is driven by the UI store's detailNoteId; open it on mount so the
// gallery shows the populated drawer rather than nothing.
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
  title: 'Surfaces/BrainSpaceDetailDrawer',
  component: BrainSpaceDetailDrawer,
  parameters: { layout: 'fullscreen', seed: 'brainSpace' },
  args: { spaceId: 's1' },
} satisfies Meta<typeof BrainSpaceDetailDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

// n2 is connected to n1 in the brainSpace seed, so the connections list renders.
export const WithConnection: Story = {
  render: () => <OpenForNote spaceId="s1" noteId="n2" />,
};

// n1 has the outgoing connection in the seed; open it to show the inverse side.
export const FromNote: Story = {
  render: () => <OpenForNote spaceId="s1" noteId="n1" />,
};

// Closed drawer: nothing is rendered into the portal.
export const Closed: Story = {};
