import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { NoteKind, NoteState, type Note } from '@/db/schema';
import { BrainSpaceNote } from './BrainSpaceNote';

const FIXED_TIME = 1704067200000;

const baseNote: Note = {
  id: 'n1',
  spaceId: 's1',
  l: 24,
  t: 24,
  w: 184,
  h: 80,
  kind: NoteKind.Note,
  state: NoteState.User,
  body: 'A passing thought worth keeping.',
  createdAt: FIXED_TIME,
};

const meta = {
  title: 'Surfaces/BrainSpaceNote',
  component: BrainSpaceNote,
  decorators: [
    (Story) => (
      <div className="relative h-64 w-[420px] border border-rule bg-paper">
        <Story />
      </div>
    ),
  ],
  args: {
    note: baseNote,
    spaceId: 's1',
    selected: false,
    pending: false,
    attachments: [],
    onPick: fn(),
  },
} satisfies Meta<typeof BrainSpaceNote>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Titled: Story = {
  args: {
    note: { ...baseNote, title: 'Opening image' },
  },
};

export const Selected: Story = {
  args: {
    note: { ...baseNote, title: 'Opening image' },
    selected: true,
  },
};

export const PendingConnection: Story = {
  args: {
    note: { ...baseNote, title: 'Connect me' },
    pending: true,
  },
};

export const SeedPrompt: Story = {
  args: {
    note: {
      ...baseNote,
      state: NoteState.SeedPrompt,
      kind: NoteKind.Question,
      body: 'What does the protagonist want?',
    },
  },
};

export const Empty: Story = {
  args: {
    note: { ...baseNote, body: '' },
  },
};

export const ImageCard: Story = {
  args: {
    note: {
      ...baseNote,
      id: 'image-note',
      kind: NoteKind.Image,
      title: 'A picture',
      body: '',
      w: 240,
      h: 200,
    },
  },
};
