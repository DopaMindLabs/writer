import type { Meta, StoryObj } from '@storybook/react-vite';
import { NEXT_RELEASE_AT } from '@/lib/releaseSchedule';
import { ReleaseNoticeBanner } from './ReleaseNoticeBanner';

const DAY_MS = 24 * 60 * 60 * 1000;

const meta = {
  tags: ['!autodocs'],
  title: 'Chrome/ReleaseNoticeBanner',
  component: ReleaseNoticeBanner,
} satisfies Meta<typeof ReleaseNoticeBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WeeksAhead: Story = { args: { now: NEXT_RELEASE_AT - 16 * DAY_MS } };
export const LastDay: Story = { args: { now: NEXT_RELEASE_AT - 2 * 60 * 60 * 1000 } };
