import type { Meta, StoryObj } from '@storybook/react-vite';
import { FocusToggle, ModeTabs } from './ModeToggle';

// ModeToggle.tsx exports two primary components: ModeTabs (the write/read/split/
// space tab strip) and FocusToggle (the enter/exit focus link). Both read the
// router's search params for the `focus` flag, so the global MemoryRouter
// decorator is sufficient to render them.

const meta = {
  title: 'Navigation/ModeTabs',
  component: ModeTabs,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof ModeTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Write: Story = {
  args: { mode: 'write', spaceId: 's1', docId: 'd1' },
};

export const Read: Story = {
  args: { mode: 'read', spaceId: 's1', docId: 'd1' },
};

export const Split: Story = {
  args: { mode: 'split', spaceId: 's1', docId: 'd1' },
};

export const Dump: Story = {
  args: { mode: 'dump', spaceId: 's1', docId: null },
};

// With no docId the per-doc tabs collapse, leaving only the space tab.
export const NoActiveDoc: Story = {
  args: { mode: 'dump', spaceId: 's1', docId: null },
};

export const FocusToggleEnter: StoryObj<typeof FocusToggle> = {
  render: (args) => <FocusToggle {...args} />,
  args: { mode: 'write', spaceId: 's1', docId: 'd1' },
};

export const FocusToggleExit: StoryObj<typeof FocusToggle> = {
  render: (args) => <FocusToggle {...args} />,
  args: { mode: 'focus', spaceId: 's1', docId: 'd1' },
};
