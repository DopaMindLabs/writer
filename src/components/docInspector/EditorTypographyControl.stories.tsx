import type { Meta, StoryObj } from '@storybook/react';
import { EditorTypographyControl } from './EditorTypographyControl';
import type { Doc } from '@/db/schema';

const baseDoc: Doc = {
  id: 'story-doc',
  spaceId: 's1',
  sectionId: 'sec1',
  name: 'Story',
  body: '',
  meta: { wordCount: 0 },
  updatedAt: 0,
};

const meta = {
  title: 'DocInspector/EditorTypographyControl',
  component: EditorTypographyControl,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof EditorTypographyControl>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InheritDefault: Story = {
  render: () => (
    <div className="mx-auto w-72 border border-rule bg-paper-2 p-4">
      <EditorTypographyControl doc={baseDoc} />
    </div>
  ),
};

export const SansOverride: Story = {
  render: () => (
    <div className="mx-auto w-72 border border-rule bg-paper-2 p-4">
      <EditorTypographyControl
        doc={{ ...baseDoc, editorFont: 'sans', editorSize: 'lg' }}
      />
    </div>
  ),
};

export const ReadOnly: Story = {
  render: () => (
    <div className="mx-auto w-72 border border-rule bg-paper-2 p-4">
      <EditorTypographyControl
        doc={{ ...baseDoc, editorFont: 'mono' }}
        readOnly
      />
    </div>
  ),
};
