import type { Meta, StoryObj } from '@storybook/react-vite';
import { SecretField } from './SecretField';

const meta = {
  tags: ['!autodocs'],
  title: 'Settings/Cloud/SecretField',
  component: SecretField,
  args: { label: 'Passphrase', value: '', onValue: () => {} },
} satisfies Meta<typeof SecretField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Invalid: Story = { args: { value: 'short', error: true } };
