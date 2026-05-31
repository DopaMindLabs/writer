import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useUI } from '@/store/ui';
import { MobileNavDrawer } from './MobileNavDrawer';

const OpenDrawer = ({
  spaceId,
  activeDocId,
}: {
  spaceId: string;
  activeDocId: string | null;
}) => {
  const setOpen = useUI((s) => s.setMobileNavOpen);
  useEffect(() => {
    setOpen(true);
    return () => { setOpen(false); };
  }, [setOpen]);
  return <MobileNavDrawer spaceId={spaceId} activeDocId={activeDocId} />;
};

const meta = {
  tags: ['!autodocs'],
  title: 'Navigation/MobileNavDrawer',
  component: MobileNavDrawer,
  parameters: { layout: 'fullscreen', seed: 'basicSpace' },
} satisfies Meta<typeof MobileNavDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  render: () => <OpenDrawer spaceId="s1" activeDocId="d1" />,
};

export const NoActiveDoc: Story = {
  render: () => <OpenDrawer spaceId="s1" activeDocId={null} />,
};

export const Closed: Story = {
  args: { spaceId: 's1', activeDocId: 'd1' },
};
