import type { Meta, StoryObj } from '@storybook/react-vite';
import { PdfHighlightsPanelContent } from './PdfHighlightsPanelContent';

/**
 * The panel binds a live query, so the story renders the empty state (no seeded
 * data). The populated list is covered by the module's `AnnotationList` story.
 */
const meta = {
  tags: ['!autodocs'],
  title: 'Pdf/PdfHighlightsPanelContent',
  component: PdfHighlightsPanelContent,
  args: { mediaId: 'story-media' },
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="w-80 border border-rule bg-paper">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PdfHighlightsPanelContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const WithFooter: Story = {
  args: {
    footerSlot: (
      <div className="border-t border-rule p-4 font-mono text-[10px] uppercase tracking-wider text-ink-2">
        + Add to brain space
      </div>
    ),
  },
};
