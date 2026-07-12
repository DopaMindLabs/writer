import type { Meta, StoryObj } from '@storybook/react-vite';
import type { DXCUserInteraction } from '@/lib/cloud/cloudClient';
import { CloudLoginDialog } from './CloudLoginDialog';

const emailInteraction: DXCUserInteraction = {
  type: 'email',
  title: 'Sign in with email',
  alerts: [],
  fields: { email: { type: 'text', placeholder: 'you@example.com' } },
  submitLabel: 'Continue',
  cancelLabel: 'Cancel',
  onSubmit: () => {},
  onCancel: () => {},
};

const meta = {
  tags: ['!autodocs'],
  title: 'Settings/Cloud/CloudLoginDialog',
  component: CloudLoginDialog,
  parameters: { layout: 'fullscreen' },
  args: { interaction: emailInteraction },
} satisfies Meta<typeof CloudLoginDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EmailStep: Story = {};
export const OtpStep: Story = {
  args: {
    interaction: {
      type: 'otp',
      title: 'Enter your code',
      alerts: [
        { type: 'info', messageCode: 'OTP_SENT', message: 'We sent you a code.', messageParams: {} },
      ],
      fields: { otp: { type: 'text', label: 'One-time code' } },
      submitLabel: 'Verify',
      cancelLabel: 'Cancel',
      onSubmit: () => {},
      onCancel: () => {},
    },
  },
};
