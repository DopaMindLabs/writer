import type { Meta, StoryObj } from '@storybook/react-vite';
import { InlineBanner } from './InlineBanner';
import { NoticeDock } from './NoticeDock';

const meta = {
  title: 'UI/NoticeDock',
  component: NoticeDock,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof NoticeDock>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The dock with the notice it was built for: a persistent status that must be
 * visible from any screen and interrupt none of them.
 */
export const WithABanner: Story = {
  args: {
    children: (
      <InlineBanner kind="warning" title="Device sync interrupted" action="Open device sync">
        Your other device is no longer connected. Nothing has been lost.
      </InlineBanner>
    ),
  },
};

/** Plain text, to show the dock's own footprint rather than a banner's. */
export const Bare: Story = { args: { children: 'A quiet notice.' } };
