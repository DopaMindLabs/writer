import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useUI } from '@/store/ui';
import { MobileMoreSheet } from './MobileMoreSheet';

// MobileMoreSheet is a bottom sheet driven by the UI store's `mobileMoreOpen`
// flag; it renders nothing into its portal while closed. The stories open it on
// mount so the gallery shows the populated sheet. The `basicSpace` seed is not
// strictly required (the sheet reads only its props + router), but it keeps the
// surrounding space/doc consistent with the other navigation stories.

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
  title: 'Navigation/MobileMoreSheet',
  component: MobileMoreSheet,
  parameters: { layout: 'fullscreen', seed: 'basicSpace' },
} satisfies Meta<typeof MobileMoreSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

// Full sheet: write/read/split mode chips are all real links, plus the menu.
export const Open: Story = {
  render: () => <OpenSheet spaceId="s1" docId="d1" />,
};

// With no active doc the read/split chips fall back to ComingSoon affordances.
export const SpaceLevel: Story = {
  render: () => <OpenSheet spaceId="s1" docId={null} />,
};

// Closed: nothing is rendered into the portal.
export const Closed: Story = {
  args: { spaceId: 's1', docId: 'd1' },
};
