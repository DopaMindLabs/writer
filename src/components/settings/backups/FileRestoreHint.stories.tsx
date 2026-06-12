import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileRestoreHint } from './FileRestoreHint';

const meta = {
  title: 'Settings/Backups/FileRestoreHint',
  component: FileRestoreHint,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="max-w-[560px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FileRestoreHint>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
