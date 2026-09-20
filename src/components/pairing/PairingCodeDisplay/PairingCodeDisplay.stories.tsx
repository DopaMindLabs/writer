import type { Meta, StoryObj } from '@storybook/react-vite';
import { MAX_QR_CHUNK_BYTES } from 'writer-sync/pairing';
import { PairingCodeDisplay } from './PairingCodeDisplay';

/** Compressed payload text, as the pairing codec emits it. */
const payloadOf = (parts: number): string =>
  'eJwrSS0uUS9KLEjNyclXKMlIVUjOSC0qUShJLS7RS87PLShKLS4pSy0qBgB'.repeat(
    Math.ceil((MAX_QR_CHUNK_BYTES * parts) / 59),
  );

const meta = {
  title: 'Pairing/PairingCodeDisplay',
  component: PairingCodeDisplay,
  args: { payload: payloadOf(1), sessionId: 'c2Vzc2lvbi1pZC0xMjM0', kind: 'offer' },
  argTypes: { kind: { control: 'inline-radio', options: ['offer', 'answer'] } },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof PairingCodeDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One symbol: no pager, because there is nothing to page through. */
export const SingleSymbol: Story = {};

/** The reply half, which the joining device shows back. */
export const Answer: Story = { args: { kind: 'answer' } };

/** A description too long for one symbol, stepped through by hand. */
export const MultipleSymbols: Story = { args: { payload: payloadOf(3) } };

/** Past the symbol ceiling: reported, never silently blank. */
export const TooLarge: Story = { args: { payload: payloadOf(9) } };
