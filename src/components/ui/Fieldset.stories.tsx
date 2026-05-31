import type { Meta, StoryObj } from '@storybook/react-vite';
import { Fieldset } from './Fieldset';
import { FormRow } from './FormRow';
import { TextField } from './TextField';
import { TextArea } from './TextArea';
import { Checkbox } from './Checkbox';

const meta = {
  title: 'Forms/Fieldset',
  component: Fieldset,
  args: { label: 'Account · 03', children: null },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Fieldset>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  render: (args) => (
    <div className="w-[640px]">
      <Fieldset {...args}>
        <div className="py-3 italic text-ink-3">— no rows yet —</div>
      </Fieldset>
    </div>
  ),
};

export const WithRows: Story = {
  render: (args) => (
    <div className="w-[640px]">
      <Fieldset {...args}>
        <FormRow label="Display name" hint="Visible to everyone.">
          <TextField defaultValue="Lila Soko" />
        </FormRow>
        <FormRow label="Email">
          <TextField type="email" defaultValue="lila@example.com" />
        </FormRow>
        <FormRow label="Bio">
          <TextArea rows={3} defaultValue="Writes about lighthouses." />
        </FormRow>
        <FormRow label="Notifications">
          <Checkbox label="Email me on new comments" defaultChecked />
        </FormRow>
      </Fieldset>
    </div>
  ),
};

export const TwoGroups: Story = {
  render: () => (
    <div className="flex w-[640px] flex-col gap-10">
      <Fieldset label="Profile · 01">
        <FormRow label="Display name">
          <TextField defaultValue="Lila" />
        </FormRow>
        <FormRow label="Email">
          <TextField defaultValue="lila@example.com" />
        </FormRow>
      </Fieldset>
      <Fieldset label="Account · 02">
        <FormRow label="Sync">
          <Checkbox label="Sync to cloud" defaultChecked />
        </FormRow>
      </Fieldset>
    </div>
  ),
};
