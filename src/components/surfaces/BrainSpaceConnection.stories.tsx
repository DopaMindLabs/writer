import type { Meta, StoryObj } from '@storybook/react-vite';
import { NoteKind, NoteState, type Connection, type Note } from '@/db/schema';
import { BrainSpaceConnection } from './BrainSpaceConnection';

const FIXED_TIME = 1704067200000;

const noteAt = (id: string, l: number, t: number): Note => ({
  id,
  spaceId: 's1',
  l,
  t,
  w: 184,
  h: 80,
  kind: NoteKind.Note,
  state: NoteState.User,
  body: 'Hello',
  createdAt: FIXED_TIME,
});

const connection: Connection = {
  id: 'c1',
  spaceId: 's1',
  fromNoteId: 'n1',
  toNoteId: 'n2',
  createdAt: FIXED_TIME,
};

const meta = {
  title: 'Surfaces/BrainSpaceConnection',
  component: BrainSpaceConnection,
  parameters: { layout: 'centered' },
  // BrainSpaceConnection renders an SVG <g>; wrap it in an <svg> so the path is
  // measurable and visible in the gallery.
  decorators: [
    (Story) => (
      <svg width={460} height={260} className="border border-rule bg-paper">
        <Story />
      </svg>
    ),
  ],
  args: {
    connection,
    from: noteAt('n1', 24, 24),
    to: noteAt('n2', 240, 140),
  },
} satisfies Meta<typeof BrainSpaceConnection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Horizontal: Story = {
  args: {
    from: noteAt('n1', 24, 100),
    to: noteAt('n2', 260, 100),
  },
};

export const ShortSpan: Story = {
  args: {
    from: noteAt('n1', 40, 40),
    to: noteAt('n2', 120, 120),
  },
};
