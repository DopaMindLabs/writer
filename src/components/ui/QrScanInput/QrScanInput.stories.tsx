import type { Meta, StoryObj } from '@storybook/react-vite';
import type { QrScanner } from 'writer-qr/scan';
import { QrScanInput } from './QrScanInput';

/** Stand-in decoders, so the story needs no camera and no WASM. */
const finds = (payload: string): QrScanner => ({
  capability: () => Promise.resolve('native'),
  scanImage: () => Promise.resolve([payload]),
});

const findsNothing: QrScanner = {
  capability: () => Promise.resolve('polyfill'),
  scanImage: () => Promise.resolve([]),
};

const meta = {
  title: 'Molecules/QrScanInput',
  component: QrScanInput,
  args: {
    fileLabel: 'Upload a photo of the code',
    pasteLabel: 'Or paste the code',
    submitLabel: 'Use this code',
    unreadableLabel: 'No code found in that image.',
    onScan: () => undefined,
    scanner: finds('W1:session:1/1:PAYLOAD'),
  },
} satisfies Meta<typeof QrScanInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Rest: Story = {};

/** What a blurry or cropped photo looks like — reported, never silent. */
export const NoCodeInImage: Story = { args: { scanner: findsNothing } };
