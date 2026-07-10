import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useUI } from '@/store/ui';
import { CitationsSidePanel } from './CitationsSidePanel';

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

export const Open: Story = {
  render: (args) => <OpenPanel spaceId={args.spaceId} />,
};

export const Closed: Story = {};
