import { useState } from 'react';
import type { QrScanner } from 'writer-qr/scan';
import { createAppQrScanner } from '@/lib/qr/appQrScanner';
import { cn } from '@/lib/utils';
import { QrScanCameraField } from './QrScanCameraField';
import { QrScanFileField } from './QrScanFileField';
import { QrScanPasteField } from './QrScanPasteField';

/**
 * The three ways to read a pairing code: point a camera at it, upload a photo,
 * or paste the payload text.
 *
 * The camera comes first because it is the only one that works between a desktop
 * and a phone unaided — the other two need a file or a wall of text carried
 * between the devices, which is awkward precisely when the devices cannot yet
 * talk to each other.
 *
 * The camera-free pair stay regardless. A camera is permission-gated and often
 * unavailable — declined, absent, unsupported, or forbidden by policy — and
 * these two need none, which is what keeps the flow usable rather than merely
 * degraded when it is missing.
 *
 * The scanner is injected so this is testable without a decoder, and so the
 * WASM ponyfill is not pulled in until something actually scans.
 */

export interface QrScanInputProps {
  onScan: (payload: string) => void;
  /** Injected in tests; defaults to the real detector. */
  scanner?: QrScanner;
  cameraLabel: string;
  cameraStartLabel: string;
  cameraStopLabel: string;
  cameraScanningLabel: string;
  cameraDeniedLabel: string;
  cameraUnavailableLabel: string;
  fileLabel: string;
  pasteLabel: string;
  submitLabel: string;
  unreadableLabel: string;
  /** Injected in tests; defaults to the browser's camera. */
  requestCamera?: () => Promise<MediaStream>;
  className?: string;
}

export const QrScanInput = ({
  onScan,
  scanner,
  cameraLabel,
  cameraStartLabel,
  cameraStopLabel,
  cameraScanningLabel,
  cameraDeniedLabel,
  cameraUnavailableLabel,
  fileLabel,
  pasteLabel,
  submitLabel,
  unreadableLabel,
  requestCamera,
  className,
}: QrScanInputProps) => {
  const [problem, setProblem] = useState<string | null>(null);
  const [detector] = useState<QrScanner>(() => scanner ?? createAppQrScanner());

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <QrScanCameraField
        scanner={detector}
        label={cameraLabel}
        startLabel={cameraStartLabel}
        stopLabel={cameraStopLabel}
        scanningLabel={cameraScanningLabel}
        deniedLabel={cameraDeniedLabel}
        unavailableLabel={cameraUnavailableLabel}
        onScan={onScan}
        requestCamera={requestCamera}
      />
      <QrScanFileField
        scanner={detector}
        label={fileLabel}
        onScan={onScan}
        onProblem={setProblem}
        unreadableLabel={unreadableLabel}
      />
      <QrScanPasteField label={pasteLabel} submitLabel={submitLabel} onScan={onScan} />
      {problem !== null && (
        <p role="status" aria-live="polite" className="text-caption text-danger">
          {problem}
        </p>
      )}
    </div>
  );
};
