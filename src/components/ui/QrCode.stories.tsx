import type { Meta, StoryObj } from '@storybook/react-vite';
import { QrCode } from './QrCode';

/** A realistic single-symbol pairing payload, as slice 2A.3's codec emits. */
const PAIRING_PAYLOAD = `W1:ICEiIyQlJicoKSorLC0uLw:1/1:${'eJwrSS0uUS9KLEjNyclXKMlIVUjOSC0qUShJLS7RS87PLShKLS4pSy0qBgB'.repeat(4)}`;

const meta = {
  title: 'Atoms/QrCode',
  component: QrCode,
  args: { value: 'https://example.test/hello', label: 'Example code' },
  argTypes: {
    ecc: { control: 'inline-radio', options: ['L', 'M', 'Q', 'H'] },
  },
} satisfies Meta<typeof QrCode>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Rest: Story = {};

/** The size a real pairing offer reaches — dense, but one symbol. */
export const PairingOffer: Story = {
  args: { value: PAIRING_PAYLOAD, label: 'Pairing offer code' },
};

/** Higher correction survives damage at the cost of a denser symbol. */
export const HighErrorCorrection: Story = {
  args: { value: PAIRING_PAYLOAD, label: 'Pairing offer code', ecc: 'H' },
};

/** The symbol inherits `currentColor`, so it follows the surrounding text. */
export const InheritsColour: Story = {
  args: { label: 'Example code' },
  render: (args) => (
    <div className="text-accent">
      <QrCode {...args} />
    </div>
  ),
};

/** A payload past the symbol ceiling reports itself instead of rendering. */
export const Unencodable: Story = {
  args: { value: 'a'.repeat(5000), label: 'Too large' },
};
