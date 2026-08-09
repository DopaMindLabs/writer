import type { Meta, StoryObj } from '@storybook/react-vite';
import { sampleMetadata } from '@/test/fixtures';
import { NotebookPageRail } from './NotebookPageRail';

const metadata = sampleMetadata('s1');
const page = {
  ...metadata,
  id: 'p1', notebookId: 'nb1', spaceId: 's1', order: 0,
  sourceAssetId: 'source', thumbnailAssetId: 'thumb', width: 100, height: 200,
  rotation: 0 as const, createdAt: 1, updatedAt: 1,
};
const asset = {
  ...metadata,
  id: 'thumb', notebookId: 'nb1', pageId: 'p1', spaceId: 's1', kind: 'thumbnail' as const,
  mime: 'image/webp', size: 1, blob: new Blob(['preview'], { type: 'image/webp' }), createdAt: 1,
};

const meta = {
  title: 'Notebook/NotebookPageRail',
  component: NotebookPageRail,
  args: { pages: [page], assets: [asset], selectedPageId: 'p1', onSelect: () => {} },
} satisfies Meta<typeof NotebookPageRail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
