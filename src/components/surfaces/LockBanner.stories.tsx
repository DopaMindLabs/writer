import type { Meta, StoryObj } from '@storybook/react-vite';
import type { Doc } from '@/db/schema';
import { EMPTY_LEXICAL_JSON } from '@/lib/docs/emptyBody';
import { asOperationId, asPrincipalId } from 'writer-sync/core';
import { LockBanner } from './LockBanner';

const FIXED_TIME = 1704067200000;

const entityMetadata = {
  accessScopeId: 's1',
  createdBy: asPrincipalId('me'),
  updatedBy: asPrincipalId('me'),
  mutationId: asOperationId('op-1'),
  logicalUpdatedAt: { millis: 0, counter: 0 },
};

const lockedDoc: Doc = {
  ...entityMetadata,
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
