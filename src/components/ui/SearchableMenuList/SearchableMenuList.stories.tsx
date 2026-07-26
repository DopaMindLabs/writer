import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SearchableMenuList, type SearchableMenuItem } from './SearchableMenuList';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/Button';

const SECTIONS: SearchableMenuItem[] = [
  { id: 'a', label: 'Manuscript' },
  { id: 'b', label: 'World' },
  { id: 'c', label: 'Workshop' },
  { id: 'd', label: 'Research' },
  { id: 'e', label: 'Outtakes' },
];

const meta = {
  title: 'Overlays/SearchableMenuList',
  component: SearchableMenuList,
  parameters: { layout: 'padded' },
  // Baseline args; the stories below drive the component through local state.
  args: {
    items: SECTIONS,
    onSelect: () => {},
    label: 'Search sections',
    placeholder: 'Search sections…',
    emptyLabel: 'No sections found',
  },
} satisfies Meta<typeof SearchableMenuList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Standalone: Story = {
  render: () => {
    const Stateful = () => {
      const [selected, setSelected] = useState('b');
      return (
        <div className="w-56 border border-rule bg-paper p-1">
          <SearchableMenuList
            items={SECTIONS}
            selectedId={selected}
            onSelect={setSelected}
            label="Search sections"
            placeholder="Search sections…"
            emptyLabel="No sections found"
          />
        </div>
      );
    };
    return <Stateful />;
  },
};

export const InsideSubmenu: Story = {
  render: () => {
    const Stateful = () => {
      const [open, setOpen] = useState(false);
      const [selected, setSelected] = useState('c');
      return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <Button kind="secondary" size="sm">
              Document
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Rename</DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Move to section</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56">
                <SearchableMenuList
                  items={SECTIONS}
                  selectedId={selected}
                  onSelect={(id) => {
                    setSelected(id);
                    setOpen(false);
                  }}
                  label="Search sections"
                  placeholder="Search sections…"
                  emptyLabel="No sections found"
                />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    };
    return <Stateful />;
  },
};
