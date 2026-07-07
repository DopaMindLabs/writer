import type { Meta, StoryObj } from '@storybook/react-vite';
import { PdfInfoPanelContent } from './PdfInfoPanelContent';

const meta = {
  tags: ['!autodocs'],
  title: 'Pdf/PdfInfoPanelContent',
  component: PdfInfoPanelContent,
  args: {
    name: 'the-long-history-of-lorem-ipsum.pdf',
    pageCount: 42,
    size: 2_400_000,
    createdAt: new Date(2026, 6, 7).getTime(),
    annotationCount: 6,
  },
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="w-[286px] border border-rule bg-paper py-2">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PdfInfoPanelContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {};
export const NoHighlights: Story = { args: { annotationCount: 0 } };
