import type { Meta, StoryObj } from '@storybook/react-vite';
import { PairDeviceSection } from './PairDeviceSection';

const meta = {
  title: 'Settings/PairDeviceSection',
  component: PairDeviceSection,
  args: { onPair: () => undefined },
} satisfies Meta<typeof PairDeviceSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The settings row, before anyone has asked to pair. */
export const Rest: Story = {};
