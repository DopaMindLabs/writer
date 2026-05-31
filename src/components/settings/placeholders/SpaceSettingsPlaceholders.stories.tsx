import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  SpaceTemplatePlaceholder,
  SpacePalettePlaceholder,
  SpaceSharingPlaceholder,
  SpaceMembersPlaceholder,
  SpaceExportPlaceholder,
} from './SpaceSettingsPlaceholders';

// Each export is a self-contained, no-prop per-space "coming soon" panel.
const meta = {
  title: 'Settings/Placeholders/SpaceSettingsPlaceholders',
  component: SpaceTemplatePlaceholder,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="max-w-[880px] p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SpaceTemplatePlaceholder>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Template: Story = {};
export const Palette: Story = { render: () => <SpacePalettePlaceholder /> };
export const Sharing: Story = { render: () => <SpaceSharingPlaceholder /> };
export const Members: Story = { render: () => <SpaceMembersPlaceholder /> };
export const Export: Story = { render: () => <SpaceExportPlaceholder /> };
