import type { Meta, StoryObj } from '@storybook/react-vite';
import { SelectionStripNoteEditor } from './SelectionStripNoteEditor';

const noop = (): void => undefined;

const meta = {
  tags: ['!autodocs'],
  title: 'Pdf/SelectionStripNoteEditor',
  component: SelectionStripNoteEditor,
  args: {
    colorSwatchClassName: 'bg-hl-yellow',
    eyebrow: 'P.12 · HIGHLIGHT + NOTE',
    placeholder: 'Add a note…',
    cancelHint: 'ESC CANCELS',
    saveHint: '↵ SAVE',
    onSave: noop,
    onCancel: noop,
  },
  decorators: [
    (Story) => (
      <div className="w-80 rounded-sm border border-rule bg-paper shadow-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SelectionStripNoteEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const WithExistingNote: Story = { args: { initialValue: 'a prior note' } };
