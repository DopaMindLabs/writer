import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

const meta = {
  title: 'Atoms/Tabs',
  component: Tabs,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="draft" className="w-80">
      <TabsList>
        <TabsTrigger value="draft">Draft</TabsTrigger>
        <TabsTrigger value="preview">Preview</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>
      <TabsContent value="draft">
        <p className="text-sm text-ink-2">Edit the working draft here.</p>
      </TabsContent>
      <TabsContent value="preview">
        <p className="text-sm text-ink-2">Read-only rendered preview.</p>
      </TabsContent>
      <TabsContent value="history">
        <p className="text-sm text-ink-2">Past revisions of this document.</p>
      </TabsContent>
    </Tabs>
  ),
};

export const Controlled: Story = {
  render: () => {
    const Stateful = () => {
      const [value, setValue] = useState('preview');
      return (
        <Tabs value={value} onValueChange={setValue} className="w-80">
          <TabsList>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="disabled" disabled>
              Locked
            </TabsTrigger>
          </TabsList>
          <TabsContent value="draft">
            <p className="text-sm text-ink-2">Draft panel.</p>
          </TabsContent>
          <TabsContent value="preview">
            <p className="text-sm text-ink-2">Preview panel.</p>
          </TabsContent>
        </Tabs>
      );
    };
    return <Stateful />;
  },
};
