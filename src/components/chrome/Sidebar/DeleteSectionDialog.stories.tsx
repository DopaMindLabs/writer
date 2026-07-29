import type { Meta, StoryObj } from '@storybook/react-vite';
import type { Section } from '@/db/schema';
import { DeleteSectionDialog } from './DeleteSectionDialog';

const sampleSection: Section = {
  id: 'sec1',
  spaceId: 's1',
  parentSectionId: null,
  label: 'Drafts',
  order: 0,
};

const meta = {
  tags: ['!autodocs'],
  title: 'Overlays/DeleteSectionDialog',
  component: DeleteSectionDialog,
  parameters: { layout: 'fullscreen', seed: 'basicSpace' },
  args: {
    section: sampleSection,
    docCount: 3,
    containsActiveDoc: false,
    open: true,
    onOpenChange: () => {},
  },
} satisfies Meta<typeof DeleteSectionDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithDocuments: Story = {};

export const Empty: Story = {
  args: { docCount: 0 },
};
