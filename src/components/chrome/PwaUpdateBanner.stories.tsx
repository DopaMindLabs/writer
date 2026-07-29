import type { Meta, StoryObj } from '@storybook/react-vite';
import { PwaUpdateBanner } from './PwaUpdateBanner';
import { pwaUpdateState } from '@/lib/pwa/updateState';

const meta = {
  title: 'Chrome/PwaUpdateBanner',
  component: PwaUpdateBanner,
} satisfies Meta<typeof PwaUpdateBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The banner only appears once the registration raises the update signal. */
export const UpdateReady: Story = {
  decorators: [
    (Story) => {
      pwaUpdateState.set(true);
      return <Story />;
    },
  ],
};
