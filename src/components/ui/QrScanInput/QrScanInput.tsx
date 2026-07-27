import { useState } from 'react';
import { createQrScanner, type QrScanner } from 'writer-qr/scan';
import { cn } from '@/lib/utils';
import { QrScanFileField } from './QrScanFileField';
import { QrScanPasteField } from './QrScanPasteField';

/**
 * The camera-free ways to read a pairing code: upload a photo, or paste the
 * payload text.
 *
 * A camera is permission-gated and often unavailable — declined, absent, or
 * unsupported. These two paths need none, which is what makes the pairing flow
 * usable without one rather than merely degraded.
 *
 * The scanner is injected so this is testable without a decoder, and so the
 * WASM ponyfill is not pulled in until something actually scans.
 */

export interface QrScanInputProps {
  onScan: (payload: string) => void;
  /** Injected in tests; defaults to the real detector. */
  scanner?: QrScanner;
  fileLabel: string;
  pasteLabel: string;
  submitLabel: string;
  unreadableLabel: string;
  className?: string;
}

export const QrScanInput = ({
  onScan,
  scanner,
  fileLabel,
  pasteLabel,
  submitLabel,
  unreadableLabel,
  className,
}: QrScanInputProps) => {
  const [problem, setProblem] = useState<string | null>(null);
  const [detector] = useState<QrScanner>(() => scanner ?? createQrScanner());

  return (
    <div className={cn('flex flex-col gap-4', className)}>
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
