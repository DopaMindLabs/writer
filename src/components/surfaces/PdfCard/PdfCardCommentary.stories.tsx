import type { Meta, StoryObj } from '@storybook/react-vite';
import { NoteKind, NoteState, type Note } from '@/db/schema';
import { PdfCardCommentary } from './PdfCardCommentary';

const baseNote: Note = {
  id: 'n1',
  spaceId: 's1',
  l: 0,
  t: 0,
  w: 100,
  h: 60,
  kind: NoteKind.Pdf,
  state: NoteState.User,
  body: 'Methods section — ε-greedy is the bit we want to cite.',
  createdAt: 0,
};

const meta = {
  title: 'Surfaces/PdfCard/PdfCardCommentary',
  component: PdfCardCommentary,
  args: { note: baseNote },
} satisfies Meta<typeof PdfCardCommentary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithCommentary: Story = {};
export const Empty: Story = { args: { note: { ...baseNote, body: '' } } };
