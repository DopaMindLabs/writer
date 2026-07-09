import type { Meta, StoryObj } from '@storybook/react-vite';
import { CloudKeylessAccountSection } from './CloudKeylessAccountSection';

const noop = () => {};

const meta = {
  tags: ['!autodocs'],
  title: 'Settings/Cloud/CloudKeylessAccountSection',
  component: CloudKeylessAccountSection,
  args: { presence: 'unknown', onUnlock: noop, onSetUp: noop },
} satisfies Meta<typeof CloudKeylessAccountSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Checking: Story = {};
export const AccountHasKey: Story = { args: { presence: 'present' } };
export const AccountHasNoKey: Story = { args: { presence: 'none' } };
