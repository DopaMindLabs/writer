import type { Meta, StoryObj } from '@storybook/react-vite';
import { Sidebar } from './Sidebar';

// Sidebar reads the space, sections, documents and notes from Dexie, so the
// stories opt into the `basicSpace` seed (spaceId `s1`, docId `d1`, section
// `sec1`). It is a tall full-height aside, framed accordingly.

const meta = {
  // Seeded stories share one Dexie DB and cannot represent distinct seed
  // states side by side, so they opt out of the combined autodocs gallery and
  // are viewed one at a time in the canvas (where the per-story reseed holds).
  tags: ['!autodocs'],
  title: 'Navigation/Sidebar',
  component: Sidebar,
  parameters: { layout: 'fullscreen', seed: 'basicSpace' },
  decorators: [
    (Story) => (
      <div className="flex h-[520px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { spaceId: 's1', activeDocId: 'd1' },
};

export const NoActiveDoc: Story = {
  args: { spaceId: 's1', activeDocId: null },
};
