import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useUI } from '@/store/ui';
import { MobileInspectorDrawer } from './MobileInspectorDrawer';

const OpenDrawer = ({ docId }: { docId: string | null }) => {
  const setOpen = useUI((s) => s.setMobileInspectorOpen);
  useEffect(() => {
    setOpen(true);
    return () => { setOpen(false); };
  }, [setOpen]);
  return <MobileInspectorDrawer docId={docId} />;
};

const meta = {
  tags: ['!autodocs'],
  title: 'Navigation/MobileInspectorDrawer',
  component: MobileInspectorDrawer,
  parameters: { layout: 'fullscreen', seed: 'basicSpace' },
  args: { docId: 'd1' },
} satisfies Meta<typeof MobileInspectorDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  render: () => <OpenDrawer docId="d1" />,
};

export const Closed: Story = {
  args: { docId: 'd1' },
};
