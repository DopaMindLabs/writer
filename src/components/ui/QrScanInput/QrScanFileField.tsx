import { useId } from 'react';
import type { QrScanner } from 'writer-qr/scan';

/**
 * Read a pairing code from a photograph.
 *
 * The middle link in the accessibility chain: no live camera needed, only an
 * image the user already has. A photo with no readable code is a normal outcome
 * — blurry, cropped, badly lit — so it is reported rather than thrown.
 */

export interface QrScanFileFieldProps {
  scanner: QrScanner;
  label: string;
  onScan: (payload: string) => void;
  onProblem: (message: string | null) => void;
  unreadableLabel: string;
}

export const QrScanFileField = ({
  scanner,
  label,
  onScan,
  onProblem,
  unreadableLabel,
}: QrScanFileFieldProps) => {
  const fieldId = useId();

  const read = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    onProblem(null);
    try {
      const found = await scanner.scanImage(file);
      if (found.length === 0) {
        onProblem(unreadableLabel);
        return;
      }
      onScan(found[0]);
    } catch {
      onProblem(unreadableLabel);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={fieldId} className="text-caption text-ink-2">
        {label}
      </label>
      <input
        id={fieldId}
        type="file"
        accept="image/*"
        onChange={(event) => {
          void read(event.target.files?.[0]);
        }}
      />
    </div>
  );
};
