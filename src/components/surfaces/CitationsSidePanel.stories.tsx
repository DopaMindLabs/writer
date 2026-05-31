import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useUI } from '@/store/ui';
import { CitationsSidePanel } from './CitationsSidePanel';

// The panel renders nothing unless the citations drawer is open; open it on
// mount for the gallery.
const OpenPanel = ({ spaceId }: { spaceId: string }) => {
  const openDrawer = useUI((s) => s.openCitationsDrawer);
  const closeDrawer = useUI((s) => s.closeCitationsDrawer);
  useEffect(() => {
    openDrawer();
    return () => { closeDrawer(); };
  }, [openDrawer, closeDrawer]);
  return <CitationsSidePanel spaceId={spaceId} />;
};

const meta = {
  // Seeded stories share one Dexie DB and cannot represent distinct seed
  // states side by side, so they opt out of the combined autodocs gallery and
  // are viewed one at a time in the canvas (where the per-story reseed holds).
  tags: ['!autodocs'],
  title: 'Surfaces/CitationsSidePanel',
  component: CitationsSidePanel,
  parameters: { layout: 'fullscreen', seed: 'basicSpace' },
  decorators: [
    (Story) => (
      <div className="h-[600px] w-full">
        <Story />
      </div>
    ),
  ],
  args: { spaceId: 's1' },
} satisfies Meta<typeof CitationsSidePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

// Open drawer over the (empty) seeded space.
export const Open: Story = {
  render: (args) => <OpenPanel spaceId={args.spaceId} />,
};

// Closed: the panel returns null.
export const Closed: Story = {};
