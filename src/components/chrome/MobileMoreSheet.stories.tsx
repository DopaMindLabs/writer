import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useUI } from '@/store/ui';
import { MobileMoreSheet } from './MobileMoreSheet';

const OpenSheet = ({
  spaceId,
  docId,
}: {
  spaceId: string | null;
  docId?: string | null;
}) => {
  const setOpen = useUI((s) => s.setMobileMoreOpen);
  useEffect(() => {
    setOpen(true);
    return () => { setOpen(false); };
  }, [setOpen]);
  return <MobileMoreSheet spaceId={spaceId} docId={docId} />;
};

const meta = {
  tags: ['!autodocs'],
  title: 'Navigation/MobileMoreSheet',
  component: MobileMoreSheet,
  parameters: { layout: 'fullscreen', seed: 'basicSpace' },
  args: { spaceId: 's1' },
} satisfies Meta<typeof MobileMoreSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  render: () => <OpenSheet spaceId="s1" docId="d1" />,
};

export const SpaceLevel: Story = {
  render: () => <OpenSheet spaceId="s1" docId={null} />,
};

export const Closed: Story = {
  args: { spaceId: 's1', docId: 'd1' },
};
