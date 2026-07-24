import type { Meta, StoryObj } from '@storybook/react-vite';
import { AnnotationList } from './AnnotationList';
import { borderRecipe } from './swatchRecipe';
import type { AnnotatorAnnotation } from '../core/types';

const mark = (
  id: string,
  page: number,
  color: string,
  quote: string,
  note?: string,
): AnnotatorAnnotation => ({
  id,
  kind: 'highlight',
  page,
  rects: [{ x: 0.1, y: 0.1, w: 0.4, h: 0.04 }],
  quote,
  color,
  note,
  createdAt: 1,
});

const annotations = [
  mark('a', 1, 'yellow', 'The quick brown fox jumps over the lazy dog.'),
  mark('b', 1, 'pink', 'A second highlight with a note attached.', 'follow up on this'),
  mark('c', 12, 'blue', 'A highlight much further into the document.'),
];

const meta = {
  tags: ['!autodocs'],
  title: 'Pdf/AnnotationList',
  component: AnnotationList,
  args: {
    annotations,
    colorBorderClassName: (id: string) => borderRecipe({ color: id as never }),
    formatGroupLabel: (page: number) => `P. ${page.toString()}`,
    formatTimestamp: () => '2:04 PM',
    onActivate: () => undefined,
  },
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="w-80 border border-rule bg-paper">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AnnotationList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Populated: Story = {};
export const Empty: Story = {
  args: { annotations: [], emptySlot: <p className="p-5 text-sm text-ink-2">No highlights yet.</p> },
};
