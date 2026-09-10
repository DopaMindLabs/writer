import type { Meta, StoryObj } from '@storybook/react-vite';
import { TrustedDeviceLinkBadge } from './TrustedDeviceLinkBadge';

const meta = {
  title: 'Settings/TrustedDeviceLinkBadge',
  component: TrustedDeviceLinkBadge,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof TrustedDeviceLinkBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A live link to the other device. */
export const Connected: Story = { args: { state: 'connected' } };

/** The link is coming up — a pairing just confirmed, or ICE still settling. */
export const Connecting: Story = { args: { state: 'connecting' } };

/** It was working and stopped. The row beside this offers a way back. */
export const Dropped: Story = { args: { state: 'dropped' } };

/**
 * No link at all — the resting state after any reload. Stated plainly and
 * without a glyph: nothing is wrong, but the row must not imply that work is
 * crossing when nothing can reach the device.
 */
export const Idle: Story = {};
