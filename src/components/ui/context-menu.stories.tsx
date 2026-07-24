import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from './context-menu';

const Demo = () => {
  const [colour, setColour] = useState('yellow');
  return (
    <ContextMenu>
      <ContextMenuTrigger className="flex h-40 w-full items-center justify-center border border-dashed border-rule text-ink-3">
        Right-click here
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuLabel>Highlight</ContextMenuLabel>
        <ContextMenuItem>Remove highlight</ContextMenuItem>
        <ContextMenuItem>Add note…</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuRadioGroup value={colour} onValueChange={setColour}>
          <ContextMenuRadioItem value="yellow">Yellow</ContextMenuRadioItem>
          <ContextMenuRadioItem value="pink">Pink</ContextMenuRadioItem>
          <ContextMenuRadioItem value="blue">Blue</ContextMenuRadioItem>
        </ContextMenuRadioGroup>
      </ContextMenuContent>
    </ContextMenu>
  );
};

const meta = {
  tags: ['!autodocs'],
  title: 'UI/ContextMenu',
  component: Demo,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
