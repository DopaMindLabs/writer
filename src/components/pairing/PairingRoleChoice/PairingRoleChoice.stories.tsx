import type { Meta, StoryObj } from '@storybook/react-vite';
import { PairingRoleChoice } from './PairingRoleChoice';

const meta = {
  title: 'Pairing/PairingRoleChoice',
  component: PairingRoleChoice,
  args: { onChoose: () => undefined },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof PairingRoleChoice>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The opening question, asked once per exchange and never switched. */
export const Rest: Story = {};
