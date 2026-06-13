import type { Meta, StoryObj } from '@storybook/react-vite';
import { MediaListSearch } from './MediaListSearch';

const meta = {
  title: 'Surfaces/MediaLibrary/MediaListSearch',
  component: MediaListSearch,
  args: { query: '', onChange: () => {} },
} satisfies Meta<typeof MediaListSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const WithQuery: Story = { args: { query: 'arxiv' } };
