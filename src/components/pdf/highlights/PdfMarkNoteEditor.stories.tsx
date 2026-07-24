import type { Meta, StoryObj } from '@storybook/react-vite';
import type { PdfAnnotation } from '@/db/schema';
import { PdfMarkNoteEditor } from './PdfMarkNoteEditor';

const mark: PdfAnnotation = {
  id: 'h1',
  mediaId: 'm1',
  spaceId: 's1',
  kind: 'highlight',
  page: 12,
  rects: [{ x: 0.1, y: 0.2, w: 0.3, h: 0.05 }],
  quote: 'a highlighted sentence',
  color: 'yellow',
  author: 'me',
  createdAt: 1,
  updatedAt: 1,
};

const noop = (): void => undefined;

const meta = {
  tags: ['!autodocs'],
  title: 'Pdf/PdfMarkNoteEditor',
  component: PdfMarkNoteEditor,
  args: { mark, onSave: noop, onCancel: noop },
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="relative h-64 w-full max-w-md bg-paper-2">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PdfMarkNoteEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const WithExistingNote: Story = { args: { mark: { ...mark, note: 'a prior note' } } };
