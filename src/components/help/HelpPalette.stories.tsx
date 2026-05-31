import { useEffect, type ReactNode } from 'react';
import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { useHelp } from '@/store/help';
import { HelpPalette } from './HelpPalette';

// The palette only renders while the help store is open, so force it open for
// the story (and reset on unmount so other stories aren't affected).
const OpenHelp = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    useHelp.setState({ open: true });
    return () => {
      useHelp.setState({ open: false });
    };
  }, []);
  return <>{children}</>;
};

const openPalette: Decorator = (Story) => (
  <OpenHelp>
    <Story />
  </OpenHelp>
);

const meta = {
  title: 'Help/HelpPalette',
  component: HelpPalette,
  parameters: { layout: 'fullscreen' },
  decorators: [openPalette],
  tags: ['!autodocs'],
} satisfies Meta<typeof HelpPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

// Interactive: type a query (e.g. "brainspace") to see live results.
export const Default: Story = {};
