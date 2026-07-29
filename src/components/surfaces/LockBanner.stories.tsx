import type { Meta, StoryObj } from '@storybook/react-vite';
import type { Doc } from '@/db/schema';
import { EMPTY_LEXICAL_JSON } from '@/lib/docs/emptyBody';
import { LockBanner } from './LockBanner';

const FIXED_TIME = 1704067200000;

const lockedDoc: Doc = {
  id: 'd1',
  spaceId: 's1',
  sectionId: 'sec1',
  name: 'Locked Doc',
  body: EMPTY_LEXICAL_JSON,
  meta: { wordCount: 0, status: 'complete' },
  updatedAt: FIXED_TIME,
};

const meta = {
  title: 'Surfaces/LockBanner',
  component: LockBanner,
  decorators: [
    (Story) => (
      <div className="max-w-[680px] p-6">
        <Story />
      </div>
    ),
  ],
  args: { doc: lockedDoc },
} satisfies Meta<typeof LockBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
