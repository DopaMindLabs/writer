import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  PlaceholderAccentDots,
  PlaceholderChips,
  PlaceholderInput,
  PlaceholderSlider,
  PlaceholderSwatchRow,
  PlaceholderThemeCards,
  PlaceholderToggle,
} from './PlaceholderPrimitives';

// These are non-interactive mock controls used to dress the "coming soon"
// settings placeholders. The gallery composes one of each.
const Gallery = () => (
  <div className="flex w-[560px] flex-col gap-6">
    <div className="flex items-center gap-4">
      <PlaceholderToggle />
      <PlaceholderToggle on />
    </div>
    <PlaceholderChips options={['Off', 'Comfortable', 'Compact']} active={1} />
    <PlaceholderSlider pct={40} a="S" b="L" v="40%" />
    <div className="flex items-center gap-3">
      <PlaceholderInput value="My space" />
      <PlaceholderInput value="ABC-123" mono />
    </div>
    <PlaceholderAccentDots />
    <PlaceholderThemeCards />
    <PlaceholderSwatchRow
      name="Bone"
      color="#fafaf6"
      rename="Rename"
      tune="Tune"
    />
  </div>
);

const meta = {
  title: 'Settings/Placeholders/PlaceholderPrimitives',
  component: Gallery,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Gallery>;

export default meta;
type Story = StoryObj<typeof meta>;

export const All: Story = {};

export const Toggle: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <PlaceholderToggle />
      <PlaceholderToggle on />
    </div>
  ),
};

export const Chips: Story = {
  render: () => (
    <PlaceholderChips options={['Off', 'Comfortable', 'Compact']} active={2} />
  ),
};

export const ThemeCards: Story = {
  render: () => (
    <div className="w-[560px]">
      <PlaceholderThemeCards />
    </div>
  ),
};
