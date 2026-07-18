import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { PdfReaderFocusToggle } from './PdfReaderFocusToggle';

const meta = {
  tags: ['!autodocs'],
  title: 'Pdf/PdfReaderFocusToggle',
  component: PdfReaderFocusToggle,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof PdfReaderFocusToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EnterFocus: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/s/s1/library/m1']}>
        <Story />
      </MemoryRouter>
    ),
  ],
};

export const ExitFocus: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/s/s1/library/m1?focus=1']}>
        <Story />
      </MemoryRouter>
    ),
  ],
};
