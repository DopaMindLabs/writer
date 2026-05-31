import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useUI } from '@/store/ui';
import { MobileNavDrawer } from './MobileNavDrawer';

// MobileNavDrawer is a left slide-over driven by the UI store's `mobileNavOpen`
// flag; it embeds the SpaceRail + Sidebar, both of which read spaces/sections/
// docs from Dexie, so the stories opt into the `basicSpace` seed. The drawer's
// own effect closes itself on mount (and on every pathname change), so the
// wrapper re-opens it from a parent effect, which runs after the child effect.

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
  // Seeded stories share one Dexie DB and cannot represent distinct seed
  // states side by side, so they opt out of the combined autodocs gallery and
  // are viewed one at a time in the canvas (where the per-story reseed holds).
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

// Closed: nothing is rendered into the portal.
export const Closed: Story = {
  args: { spaceId: 's1', activeDocId: 'd1' },
};
