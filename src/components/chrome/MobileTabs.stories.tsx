import type { Meta, StoryObj } from '@storybook/react-vite';
import { MobileTabs } from './MobileTabs';

// The fixed bottom tab strip (write / read / brain / cite / more). It reads the
// router pathname for the active tab and dispatches to the UI store for the
// drawer/citations actions, so the global MemoryRouter decorator is enough to
// render it. The strip is hidden at >= md, so it is framed full-bleed.

const meta = {
  title: 'Navigation/MobileTabs',
  component: MobileTabs,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="w-[390px] border-x border-rule">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MobileTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

// Active doc: write/read/brain resolve to real links, cite/more are buttons.
export const WithActiveDoc: Story = {
  args: { spaceId: 's1', docId: 'd1' },
};

// No active doc: write falls back to the space-level route, read has no target.
export const SpaceLevel: Story = {
  args: { spaceId: 's1', docId: null },
};

// No space at all: write falls back to home, brain has no target.
export const NoSpace: Story = {
  args: { spaceId: null, docId: null },
};
