import type { Meta, StoryObj } from '@storybook/react-vite';
import { DocInspectorIcons } from './DocInspectorIcons';

// The collapsed icon rail for the inspector. It reads/writes the active section
// from the `useUI` store; the default value renders without a seed. The aside is
// hidden below the `md` breakpoint, so it is framed in a tall wrapper.

const meta = {
  title: 'Navigation/DocInspectorIcons',
  component: DocInspectorIcons,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="flex h-[320px] justify-end">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DocInspectorIcons>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
