import type { Meta, StoryObj } from '@storybook/react-vite';
import { MediaLibraryControls } from './MediaLibraryControls';

const noop = (): void => undefined;

const meta = {
  tags: ['!autodocs'],
  title: 'Media/MediaLibraryControls',
  component: MediaLibraryControls,
  args: {
    query: '',
    onQueryChange: noop,
    filter: 'all',
    onFilterChange: noop,
    sort: 'recent',
    onSortChange: noop,
  },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof MediaLibraryControls>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Searching: Story = { args: { query: 'darwin', filter: 'annotated' } };
