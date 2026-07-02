import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { PresenceHuePicker } from './PresenceHuePicker';
import type { PresenceHue } from '@/lib/account/profile';

const meta = {
  title: 'Settings/PresenceHuePicker',
  component: PresenceHuePicker,
  parameters: { layout: 'centered' },
  args: {
    label: 'Presence colour',
    value: 'presence-1',
    onChange: () => {},
  },
} satisfies Meta<typeof PresenceHuePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

const InteractivePresenceHuePicker = () => {
  const [hue, setHue] = useState<PresenceHue>('presence-1');
  return <PresenceHuePicker label="Presence colour" value={hue} onChange={setHue} />;
};

export const Default: Story = { render: () => <InteractivePresenceHuePicker /> };
