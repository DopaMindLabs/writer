import type { Meta, StoryObj } from '@storybook/react-vite';
import type { Doc } from '@/db/schema';
import { EMPTY_LEXICAL_JSON } from '@/lib/docs/emptyBody';
import { WriteSurface } from './WriteSurface';

const FIXED_TIME = 1704067200000;

const sampleDoc: Doc = {
  id: 'd1',
  spaceId: 's1',
  sectionId: 'sec1',
  name: 'Sample Doc',
  body: EMPTY_LEXICAL_JSON,
  meta: { wordCount: 0 },
  updatedAt: FIXED_TIME,
};

const meta = {
  title: 'Surfaces/WriteSurface',
  component: WriteSurface,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="h-[600px] w-full border border-rule">
        <Story />
      </div>
    ),
  ],
  args: { doc: sampleDoc, mode: 'write' },
} satisfies Meta<typeof WriteSurface>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Write: Story = {};

export const Focus: Story = {
  args: { mode: 'focus' },
};

export const Read: Story = {
  args: { mode: 'read' },
};
