import type { Meta, StoryObj } from '@storybook/react-vite';
import { LocalNetworkSyncSectionPanel } from './LocalNetworkSyncSectionPanel';

/**
 * `LocalNetworkSyncSection` self-gates and renders nothing unless the hidden
 * beta gates are active, so the story previews the always-on panel directly.
 */
const meta = {
  tags: ['!autodocs'],
  title: 'Settings/LocalNetworkSync/LocalNetworkSyncSection',
  component: LocalNetworkSyncSectionPanel,
} satisfies Meta<typeof LocalNetworkSyncSectionPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Panel: Story = {};
