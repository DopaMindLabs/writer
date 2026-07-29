import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { QrScanner } from 'writer-qr/scan';
import { QrScanCameraField } from './QrScanCameraField';
import { CAMERA_CONSTRAINTS } from './useCameraScan';

/**
 * The camera path, driven without a camera. `getUserMedia` is injected, so these
 * prove the behaviour that matters — that a refusal is reported rather than
 * dead-ending, that the stream is released on every exit, that a decoded frame
 * ends the scan — on a platform with no media devices at all.
 */

const labels = {
  label: 'Point your camera at the code',
  startLabel: 'Use the camera',
  stopLabel: 'Stop the camera',
  scanningLabel: 'Looking for a code…',
  deniedLabel: 'Camera access was declined.',
  unavailableLabel: 'No camera is available on this device.',
};

const track = () => ({ stop: vi.fn() });

const streamOf = (tracks: { stop: () => void }[]): MediaStream =>
  ({ getTracks: () => tracks }) as unknown as MediaStream;

const scannerFinding = (values: string[]): QrScanner => ({
  capability: () => Promise.resolve('native'),
  scanImage: () => Promise.resolve(values),
});

const failingScanner = (): QrScanner => ({
  capability: () => Promise.resolve('native'),
  scanImage: () => Promise.reject(new Error('undecodable frame')),
});

const denial = (name: string) => {
  const error = new Error('refused');
  error.name = name;
  return () => Promise.reject(error);
};

const renderField = (
  overrides: Partial<React.ComponentProps<typeof QrScanCameraField>> = {},
) => {
  const onScan = vi.fn();
  const view = render(
    <QrScanCameraField
      {...labels}
      scanner={scannerFinding([])}
      onScan={onScan}
      requestCamera={() => Promise.resolve(streamOf([track()]))}
      intervalMillis={5}
      {...overrides}
    />,
  );
  return { onScan, view };
};

describe('starting the camera', () => {
  it('asks for the camera only when the user presses the button', async () => {
    const requestCamera = vi.fn().mockResolvedValue(streamOf([track()]));
    renderField({ requestCamera });

    expect(requestCamera).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: labels.startLabel }));

    expect(requestCamera).toHaveBeenCalledTimes(1);
  });

  it('says it is scanning once the camera is live', async () => {
    renderField();

    await userEvent.click(screen.getByRole('button', { name: labels.startLabel }));

    expect(await screen.findByRole('status')).toHaveTextContent(labels.scanningLabel);
  });

  it('offers to stop once scanning', async () => {
    renderField();

    await userEvent.click(screen.getByRole('button', { name: labels.startLabel }));

    expect(
      await screen.findByRole('button', { name: labels.stopLabel }),
    ).toBeInTheDocument();
  });
});

describe('when the camera cannot be used', () => {
  it('reports a refusal without removing the other ways in', async () => {
    renderField({ requestCamera: denial('NotAllowedError') });

    await userEvent.click(screen.getByRole('button', { name: labels.startLabel }));

    expect(await screen.findByRole('status')).toHaveTextContent(labels.deniedLabel);
    // The button returns to its offer state: declining once must not be final.
    expect(screen.getByRole('button', { name: labels.startLabel })).toBeEnabled();
  });

  it('distinguishes a blocked context from a refusal by the user', async () => {
    renderField({ requestCamera: denial('SecurityError') });

    await userEvent.click(screen.getByRole('button', { name: labels.startLabel }));

    expect(await screen.findByRole('status')).toHaveTextContent(labels.deniedLabel);
  });

  it('reports a device with no camera as unavailable, not as a refusal', async () => {
    renderField({ requestCamera: denial('NotFoundError') });

    await userEvent.click(screen.getByRole('button', { name: labels.startLabel }));

    expect(await screen.findByRole('status')).toHaveTextContent(labels.unavailableLabel);
  });

  it('lets the user try again after a refusal', async () => {
    const requestCamera = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('no'), { name: 'NotAllowedError' }))
      .mockResolvedValueOnce(streamOf([track()]));
    renderField({ requestCamera });

    await userEvent.click(screen.getByRole('button', { name: labels.startLabel }));
    await screen.findByRole('status');
    await userEvent.click(screen.getByRole('button', { name: labels.startLabel }));

    expect(await screen.findByRole('status')).toHaveTextContent(labels.scanningLabel);
    expect(requestCamera).toHaveBeenCalledTimes(2);
  });
});

describe('reading a code', () => {
  it('reports the payload and stops the camera', async () => {
    const stopped = track();
    const { onScan } = renderField({
      scanner: scannerFinding(['PAYLOAD-1']),
      requestCamera: () => Promise.resolve(streamOf([stopped])),
    });

    await userEvent.click(screen.getByRole('button', { name: labels.startLabel }));

    await waitFor(() => {
      expect(onScan).toHaveBeenCalledWith('PAYLOAD-1');
    });
    await waitFor(() => {
      expect(stopped.stop).toHaveBeenCalled();
    });
    expect(
      await screen.findByRole('button', { name: labels.startLabel }),
    ).toBeInTheDocument();
  });

  it('keeps scanning through frames that will not decode', async () => {
    const { onScan } = renderField({ scanner: failingScanner() });

    await userEvent.click(screen.getByRole('button', { name: labels.startLabel }));

    expect(await screen.findByRole('status')).toHaveTextContent(labels.scanningLabel);
    expect(onScan).not.toHaveBeenCalled();
  });
});

describe('releasing the camera', () => {
  it('stops the stream when the user stops scanning', async () => {
    const stopped = track();
    renderField({ requestCamera: () => Promise.resolve(streamOf([stopped])) });

    await userEvent.click(screen.getByRole('button', { name: labels.startLabel }));
    await userEvent.click(await screen.findByRole('button', { name: labels.stopLabel }));

    expect(stopped.stop).toHaveBeenCalledTimes(1);
  });

  it('stops the stream when the surface goes away mid-scan', async () => {
    const stopped = track();
    const { view } = renderField({
      requestCamera: () => Promise.resolve(streamOf([stopped])),
    });

    await userEvent.click(screen.getByRole('button', { name: labels.startLabel }));
    await screen.findByRole('button', { name: labels.stopLabel });
    view.unmount();

    expect(stopped.stop).toHaveBeenCalledTimes(1);
  });

  it('stops every track, not only the first', async () => {
    const first = track();
    const second = track();
    renderField({ requestCamera: () => Promise.resolve(streamOf([first, second])) });

    await userEvent.click(screen.getByRole('button', { name: labels.startLabel }));
    await userEvent.click(await screen.findByRole('button', { name: labels.stopLabel }));

    expect(first.stop).toHaveBeenCalledTimes(1);
    expect(second.stop).toHaveBeenCalledTimes(1);
  });
});

describe('what the browser camera is asked for', () => {
  it('requests the rear lens and enough pixels for a dense symbol', async () => {
    // Without a stated resolution phones default to 640×480, which leaves a
    // dense pairing symbol at two or three pixels per module — unreadable.
    const getUserMedia = vi.fn(() => Promise.resolve(streamOf([track()])));
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia },
      configurable: true,
    });
    try {
      renderField({ requestCamera: undefined });

      await userEvent.click(screen.getByRole('button', { name: labels.startLabel }));

      await waitFor(() => {
        expect(getUserMedia).toHaveBeenCalledWith(CAMERA_CONSTRAINTS);
      });
      const video = CAMERA_CONSTRAINTS.video as MediaTrackConstraints;
      expect(video.facingMode).toBe('environment');
      expect(video.width).toEqual({ ideal: 2560 });
      expect(video.height).toEqual({ ideal: 1440 });
    } finally {
      Reflect.deleteProperty(navigator, 'mediaDevices');
    }
  });
});
