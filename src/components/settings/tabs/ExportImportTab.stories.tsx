import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { ExportImportTab } from './ExportImportTab';

const meta = {
  title: 'Settings/Tabs/ExportImportTab',
  component: ExportImportTab,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div className="max-w-[720px]">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof ExportImportTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
