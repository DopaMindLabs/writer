import type { Meta, StoryObj } from '@storybook/react-vite';
import type { Doc } from '@/db/schema';
import { asOperationId, asPrincipalId } from 'writer-sync/core';
import { DeleteDocDialog } from './DeleteDocDialog';

const entityMetadata = {
  accessScopeId: 's1',
  createdBy: asPrincipalId('me'),
  updatedBy: asPrincipalId('me'),
  mutationId: asOperationId('op-1'),
  logicalUpdatedAt: { millis: 0, counter: 0 },
};

const sampleDoc: Doc = {
  ...entityMetadata,
  id: 'd1',
  spaceId: 's1',
  sectionId: 'sec1',
  name: 'Sample Doc',
  body: '',
  meta: { wordCount: 0 },
  updatedAt: 0,
};

const meta = {
  tags: ['!autodocs'],
  title: 'Overlays/DeleteDocDialog',
  component: DeleteDocDialog,
  parameters: { layout: 'fullscreen', seed: 'basicSpace' },
  args: {
    doc: sampleDoc,
    isActiveDoc: false,
    open: true,
    onOpenChange: () => {},
  },
} satisfies Meta<typeof DeleteDocDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};
