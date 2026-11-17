import type { QrScanner } from 'writer-qr/scan';
import { Button } from '@/components/ui/Button';
import { useCameraScan, type CameraScanState } from './useCameraScan';

/**
 * Read a pairing code with the camera.
 *
 * Offered first because it is the only path that works between a desktop and a
 * phone without shuttling a file or a wall of text between them — but never the
 * only path. The camera is asked for when the user presses the button, not on
 * mount: a permission prompt nobody invited is how people learn to press Block.
 *
 * A refusal is reported and the flow continues; the upload and paste fields
 * below are always present, so declining costs the user nothing but a sentence.
 */

export interface QrScanCameraFieldProps {
  scanner: QrScanner;
  label: string;
  startLabel: string;
  stopLabel: string;
  scanningLabel: string;
  deniedLabel: string;
  unavailableLabel: string;
  onScan: (payload: string) => void;
  /** Injected in tests; defaults to the browser's camera. */
  requestCamera?: () => Promise<MediaStream>;
  intervalMillis?: number;
}

const statusFor = (
  state: CameraScanState,
  labels: { scanningLabel: string; deniedLabel: string; unavailableLabel: string },
): string | null => {
  if (state === 'scanning') return labels.scanningLabel;
  if (state === 'denied') return labels.deniedLabel;
  if (state === 'unavailable') return labels.unavailableLabel;
  return null;
};

export const QrScanCameraField = ({
  scanner,
  label,
  startLabel,
  stopLabel,
  scanningLabel,
  deniedLabel,
  unavailableLabel,
  onScan,
  requestCamera,
  intervalMillis,
}: QrScanCameraFieldProps) => {
  const { state, start, stop, videoRef } = useCameraScan({
    scanner,
    onScan,
    requestCamera,
    intervalMillis,
  });
  const live = state === 'scanning';
  const status = statusFor(state, { scanningLabel, deniedLabel, unavailableLabel });

  return (
    <div className="flex flex-col gap-2">
      <span className="text-caption text-ink-2">{label}</span>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        aria-label={label}
        data-testid="qr-scan-camera"
        // Kept mounted so the stream has somewhere to attach the instant it
        // arrives, and hidden rather than unmounted so the ref stays stable.
        className={live ? 'w-64 max-w-full self-center bg-ink' : 'hidden'}
      />
      <Button
        type="button"
        kind="secondary"
        size="sm"
        className="self-start"
        onClick={live ? stop : start}
        disabled={state === 'starting'}
      >
        {live ? stopLabel : startLabel}
      </Button>
      {status !== null && (
        <p role="status" aria-live="polite" className="text-caption text-ink-2">
          {status}
        </p>
      )}
    </div>
  );
};
