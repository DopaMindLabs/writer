import type { Meta, StoryObj } from '@storybook/react-vite';
import type { Section } from '@/db/schema';
import { SectionRowMenu } from './SectionRowMenu';

const sampleSection: Section = {
  id: 'sec1',
  spaceId: 's1',
  parentSectionId: null,
  label: 'Drafts',
  order: 0,
};

const meta = {
  tags: ['!autodocs'],
  title: 'Navigation/SectionRowMenu',
  component: SectionRowMenu,
  parameters: { layout: 'fullscreen', seed: 'basicSpace' },
  decorators: [
    (Story) => (
      <div className="group flex w-56 justify-end p-4">
        <Story />
      </div>
    ),
  ],
  args: {
    section: sampleSection,
    docCount: 3,
    containsActiveDoc: false,
    canModify: true,
    isWorkshop: false,
    onAddDoc: () => {},
    onRename: () => {},
  },
} satisfies Meta<typeof SectionRowMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AddOnly: Story = {
  args: {
    section: { ...sampleSection, label: 'Workshop' },
    canModify: false,
    isWorkshop: true,
  },
};
