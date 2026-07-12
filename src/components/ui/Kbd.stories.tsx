import type { Meta, StoryObj } from '@storybook/react-vite';
import { Kbd } from './Kbd';

const meta = {
  title: 'Atoms/Kbd',
  component: Kbd,
  args: { keys: 'mod+s' },
  parameters: {
    docs: {
      description: {
        component:
          'The modifier is derived from the running platform, so the glyph shown here follows the machine viewing Storybook (⌘ on macOS, Ctrl elsewhere).',
      },
    },
  },
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Modifier: Story = { args: { keys: 'mod+s' } };
export const WithShift: Story = { args: { keys: 'mod+shift+m' } };
export const BareKey: Story = { args: { keys: '?' } };
export const Comma: Story = { args: { keys: 'mod+,' } };
