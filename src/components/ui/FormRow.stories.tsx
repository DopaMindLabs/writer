import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRow } from './FormRow';
import { TextField } from './TextField';
import { TextArea } from './TextArea';
import { Select, type SelectOption } from './Select';
import { Checkbox } from './Checkbox';
import { RadioRow, type RadioOption } from './RadioRow';

const THEMES: SelectOption[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Match system' },
];

const RADIO_THEMES: RadioOption[] = THEMES;

const meta = {
  title: 'Forms/FormRow',
  component: FormRow,
  args: { label: 'Document name' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof FormRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithTextField: Story = {
  render: (args) => (
    <div className="w-[640px]">
      <FormRow {...args} htmlFor="story-doc-name">
        <TextField id="story-doc-name" placeholder="Untitled" />
      </FormRow>
    </div>
  ),
};

export const WithHint: Story = {
  render: () => (
    <div className="w-[640px]">
      <FormRow
        label="Document name"
        hint="Visible to collaborators and in the URL."
      >
        <TextField placeholder="Untitled" />
      </FormRow>
    </div>
  ),
};

export const WithError: Story = {
  render: () => (
    <div className="w-[640px]">
      <FormRow label="Document name" error="Name is required.">
        <TextField defaultValue="" error />
      </FormRow>
    </div>
  ),
};

export const Composed: Story = {
  render: () => (
    <div className="w-[640px]">
      <FormRow label="Document name" hint="Visible to collaborators.">
        <TextField defaultValue="On reading slowly" />
      </FormRow>
      <FormRow label="Abstract" hint="A two-line summary.">
        <TextArea rows={3} defaultValue="An essay on attention." />
      </FormRow>
      <FormRow label="Theme">
        <Select options={THEMES} defaultValue="dark" />
      </FormRow>
      <FormRow label="Appearance">
        <RadioRow
          name="story-theme"
          options={RADIO_THEMES}
          value="light"
          onChange={() => {}}
        />
      </FormRow>
      <FormRow label="Sync">
        <Checkbox label="Sync to cloud" defaultChecked />
      </FormRow>
    </div>
  ),
};
