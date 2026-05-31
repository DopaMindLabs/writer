import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  GeneralPlaceholder,
  AppearancePlaceholder,
  TypographyPlaceholder,
  ShortcutsPlaceholder,
  TemplatesPlaceholder,
  PalettesPlaceholder,
  CitationsPlaceholder,
  AnnotationPlaceholder,
  ExportPlaceholder,
  DataPlaceholder,
  AccountPlaceholder,
  AboutPlaceholder,
  BackupsPlaceholder,
} from './GlobalSettingsPlaceholders';

// Each export is a self-contained, no-prop "coming soon" settings panel.
const meta = {
  title: 'Settings/Placeholders/GlobalSettingsPlaceholders',
  component: GeneralPlaceholder,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="max-w-[880px] p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof GeneralPlaceholder>;

export default meta;
type Story = StoryObj<typeof meta>;

export const General: Story = {};
export const Appearance: Story = { render: () => <AppearancePlaceholder /> };
export const Typography: Story = { render: () => <TypographyPlaceholder /> };
export const Shortcuts: Story = { render: () => <ShortcutsPlaceholder /> };
export const Templates: Story = { render: () => <TemplatesPlaceholder /> };
export const Palettes: Story = { render: () => <PalettesPlaceholder /> };
export const Citations: Story = { render: () => <CitationsPlaceholder /> };
export const Annotation: Story = { render: () => <AnnotationPlaceholder /> };
export const Export: Story = { render: () => <ExportPlaceholder /> };
export const Data: Story = { render: () => <DataPlaceholder /> };
export const Account: Story = { render: () => <AccountPlaceholder /> };
export const About: Story = { render: () => <AboutPlaceholder /> };
export const Backups: Story = { render: () => <BackupsPlaceholder /> };
