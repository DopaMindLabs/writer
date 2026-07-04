import type { Meta, StoryObj } from '@storybook/react-vite';
import { CloudSectionPanel } from './CloudSectionPanel';

/**
 * `CloudSection` self-gates and renders nothing without the activation gates, so
 * the story previews the always-on panel (`CloudSectionPanel`) directly.
 */
const meta = {
  tags: ['!autodocs'],
  title: 'Settings/Cloud/CloudSection',
  component: CloudSectionPanel,
} satisfies Meta<typeof CloudSectionPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Panel: Story = {};
