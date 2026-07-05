import type { Meta, StoryObj } from '@storybook/react-vite';
import { CloudKeyConflictSection } from './CloudKeyConflictSection';

const meta = {
  title: 'Settings/Cloud/CloudKeyConflictSection',
  component: CloudKeyConflictSection,
  args: {
    onResolved: () => undefined,
  },
} satisfies Meta<typeof CloudKeyConflictSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
