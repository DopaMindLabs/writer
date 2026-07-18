import type { Meta, StoryObj } from '@storybook/react-vite';
import { ReaderBackLink } from './ReaderBackLink';

const meta = {
  tags: ['!autodocs'],
  title: 'Pdf/ReaderBackLink',
  component: ReaderBackLink,
  args: { spaceId: 's1' },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof ReaderBackLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
