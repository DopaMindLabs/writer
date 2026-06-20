import type { Meta, StoryObj } from '@storybook/react';
import { useEffect } from 'react';
import { TypographyTab } from './TypographyTab';
import { useUI } from '@/store/ui';
import type { EditorFont, EditorSize } from '@/lib/editorTypography';

const meta = {
  title: 'Settings/TypographyTab',
  component: TypographyTab,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof TypographyTab>;

export default meta;
type Story = StoryObj<typeof meta>;

const WithPreset = ({ font, size }: { font: EditorFont; size: EditorSize }) => {
  useEffect(() => {
    useUI.setState({ editorFont: font, editorSize: size });
  }, [font, size]);
  return (
    <div className="mx-auto max-w-[920px]">
      <TypographyTab />
    </div>
  );
};

export const Default: Story = { render: () => <WithPreset font="serif" size="base" /> };
export const SansLarge: Story = { render: () => <WithPreset font="sans" size="lg" /> };
export const MonoSmall: Story = { render: () => <WithPreset font="mono" size="sm" /> };
export const SerifExtraLarge: Story = { render: () => <WithPreset font="serif" size="xl" /> };
