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

/** The shape `getUserMedia` rejects with; the name is what the UI branches on. */
const refusal = (name: string): Error => Object.assign(new Error('refused'), { name });

const meta = {
  title: 'Molecules/QrScanInput',
  component: QrScanInput,
  args: {
    cameraLabel: 'Point your camera at the code',
    cameraStartLabel: 'Use the camera',
    cameraStopLabel: 'Stop the camera',
    cameraScanningLabel: 'Looking for a code…',
    cameraDeniedLabel:
      'Camera access was declined. You can still upload a photo or paste the code below.',
    cameraUnavailableLabel:
      'No camera is available on this device. You can still upload a photo or paste the code below.',
    fileLabel: 'Upload a photo of the code',
    pasteLabel: 'Or paste the code',
    submitLabel: 'Use this code',
    unreadableLabel: 'No code found in that image.',
    onScan: () => undefined,
    scanner: finds('W1:session:1/1:PAYLOAD'),
    // Storybook has no camera to grant; stories drive the refusal paths, which
    // are the states worth reviewing anyway.
    requestCamera: () => Promise.reject(refusal('NotFoundError')),
  },
} satisfies Meta<typeof QrScanInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Rest: Story = {};

/** What a blurry or cropped photo looks like — reported, never silent. */
export const NoCodeInImage: Story = { args: { scanner: findsNothing } };

/**
 * The camera declined. The upload and paste fields stay exactly where they were —
 * saying no costs the user a sentence, not the feature.
 */
export const CameraDeclined: Story = {
  args: { requestCamera: () => Promise.reject(refusal('NotAllowedError')) },
};

/** A desktop with no camera at all: a different sentence, the same fallbacks. */
export const NoCameraPresent: Story = {
  args: { requestCamera: () => Promise.reject(refusal('NotFoundError')) },
};
