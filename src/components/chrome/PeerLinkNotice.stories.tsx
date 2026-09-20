import type { Meta, StoryObj } from '@storybook/react-vite';
import { asDeviceId } from 'writer-sync/core';
import { peerLinkStatus } from '@/lib/writerSyncIntegration/peerLinkStatus';
import { PeerLinkNotice } from './PeerLinkNotice';

const PEER = asDeviceId('peer-1');

const meta = {
  tags: ['!autodocs'],
  title: 'Chrome/PeerLinkNotice',
  component: PeerLinkNotice,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof PeerLinkNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A link that was carrying work and stopped. It sits in the dock, out of the
 * flow: nothing moves on the page beneath, and nothing has to be dismissed
 * before writing can continue.
 */
export const AfterADrop: Story = {
  decorators: [
    (Story) => {
      peerLinkStatus.reset();
      peerLinkStatus.observe(PEER, 'connected');
      peerLinkStatus.observe(PEER, 'interrupted');
      return <Story />;
    },
  ],
};

/**
 * The resting state, which renders nothing: no session survives a reload, so a
 * page that has connected to nothing has nothing to report.
 */
export const Silent: Story = {
  decorators: [
    (Story) => {
      peerLinkStatus.reset();
      return <Story />;
    },
  ],
};
