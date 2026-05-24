import type { Meta, StoryObj } from '@storybook/react-vite';
import { Glyph } from './Glyph';

const meta = {
  title: 'Atoms/Glyph',
  component: Glyph,
  args: { label: 'More', children: '⋯' },
  argTypes: {
    size: { control: { type: 'number', min: 14, max: 32, step: 2 } },
    on: { control: 'boolean' },
    italic: { control: 'boolean' },
  },
} satisfies Meta<typeof Glyph>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Rest: Story = {};
export const On: Story = { args: { on: true } };
export const HelpItalic: Story = {
  args: { label: 'Help', children: '?', italic: true },
};

export const Matrix: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      {(['⋯', '⌕', '⤢', '⋮', '◐', '§', '?'] as const).map((g) => (
        <div key={g} className="flex flex-col items-center gap-2">
          <Glyph label={`${g} rest`}>{g}</Glyph>
          <Glyph label={`${g} on`} on>
            {g}
          </Glyph>
        </div>
      ))}
      <div className="flex flex-col items-center gap-2">
        <Glyph label="help italic" italic>
          ?
        </Glyph>
        <Glyph label="help italic on" italic on>
          ?
        </Glyph>
      </div>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Glyph label="14" size={14}>
        ⋯
      </Glyph>
      <Glyph label="18" size={18}>
        ⋯
      </Glyph>
      <Glyph label="22" size={22}>
        ⋯
      </Glyph>
      <Glyph label="28" size={28}>
        ⋯
      </Glyph>
    </div>
  ),
};
