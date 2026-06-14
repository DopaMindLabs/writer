import type { Meta, StoryObj } from '@storybook/react-vite';
import { NoteKind, NoteState, type Note } from '@/db/schema';
import { PdfCardReady } from './PdfCardReady';

const note: Note = {
  id: 'n1',
  spaceId: 's1',
  l: 0,
  t: 0,
  w: 240,
  h: 220,
  kind: NoteKind.Pdf,
  state: NoteState.User,
  body: 'Methods section — ε-greedy is the bit we want to cite.',
  createdAt: 0,
};

const meta = {
  title: 'Surfaces/PdfCard/PdfCardReady',
  component: PdfCardReady,
  args: {
    note,
    name: '1706.03762.pdf',
    blob: new Blob(['%PDF-1.4'], { type: 'application/pdf' }),
    pageCount: 8,
    onOpenBeside: () => {},
    onEditSource: () => {},
    onRefresh: () => {},
  },
} satisfies Meta<typeof PdfCardReady>;

export default meta;
type Story = StoryObj<typeof meta>;

export const UrlSource: Story = {};
export const LibrarySource: Story = { args: { onRefresh: undefined } };
