import type { Meta, StoryObj } from '@storybook/react-vite';
import type { Doc } from '@/db/schema';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/Button';
import { MoveDocSubmenu } from './MoveDocSubmenu';

const sampleDoc: Doc = {
  id: 'd1',
  spaceId: 's1',
  sectionId: 'sec1',
  name: 'Sample Doc',
  body: '',
  meta: { wordCount: 0 },
  updatedAt: 0,
};

const meta = {
  tags: ['!autodocs'],
  title: 'Navigation/MoveDocSubmenu',
  component: MoveDocSubmenu,
  // basicSpace seeds a top section (Drafts) plus a subsection (Ideas).
  parameters: { layout: 'centered', seed: 'basicSpace' },
  args: { doc: sampleDoc },
  render: (args) => (
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger asChild>
        <Button kind="secondary" size="sm">
          Options
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>Rename</DropdownMenuItem>
        <MoveDocSubmenu {...args} />
        <DropdownMenuItem>Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
} satisfies Meta<typeof MoveDocSubmenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A doc living in a subsection: its parent top-level section is a valid target. */
export const Default: Story = {
  args: { doc: { ...sampleDoc, sectionId: 'sec1a' } },
};

/** A doc in the space's only top-level section: nowhere to move, so disabled. */
export const NoTargets: Story = {};
