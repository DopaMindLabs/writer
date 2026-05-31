import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useUI } from '@/store/ui';
import type { Doc } from '@/db/schema';
import { VersionHistoryModal } from './VersionHistoryModal';

const doc: Doc = {
  id: 'd1',
  spaceId: 's1',
  sectionId: 'sec1',
  name: 'The bell-keeper',
  body: 'The bell rang twice across the quiet valley.',
  meta: { wordCount: 8 },
  updatedAt: 1704067200000,
};

const OpenModal = () => {
  const setOpen = useUI((s) => s.setVersionModalOpen);
  useEffect(() => {
    setOpen(true);
    return () => { setOpen(false); };
  }, [setOpen]);
  return <VersionHistoryModal doc={doc} />;
};

const meta = {
  tags: ['!autodocs'],
  title: 'Navigation/VersionHistoryModal',
  component: VersionHistoryModal,
  parameters: { layout: 'fullscreen', seed: 'docWithRevisions' },
} satisfies Meta<typeof VersionHistoryModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  render: () => <OpenModal />,
};
