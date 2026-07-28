import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PairingError,
  PairingErrorCode,
  createQrPartCollector,
  type QrCollectionProgress,
} from 'writer-sync/pairing';
import type { QrScanner } from 'writer-qr/scan';
import { QrScanInput } from '@/components/ui/QrScanInput/QrScanInput';
import { StatusGlyph } from '@/components/ui/StatusGlyph';

/**
 * Reads the other device's pairing code, symbol by symbol.
 *
 * A payload may span several symbols, so this holds a collector across scans
 * and reports which indices are still outstanding — a scan that appears to do
 * nothing is indistinguishable from a broken camera, and naming the missing
 * symbol is the difference between the two.
 *
 * The payload is handed on only once the set is complete. Validating a partial
 * payload would blame the codec for what was really a missed scan.
 */

export interface PairingCodeScannerProps {
  /** Called once with the reassembled payload text. */
  onPayload: (payload: string) => void;
  /** Injected in tests and stories; defaults to the real detector. */
  scanner?: QrScanner;
  /** Injected in tests and stories; defaults to the browser's camera. */
  requestCamera?: () => Promise<MediaStream>;
}

/** A refused symbol maps to fixed copy — never to the offending text. */
const problemKey = (error: unknown): string =>
  error instanceof PairingError && error.code === PairingErrorCode.BadQrSequence
    ? 'settings.pairing.scan.unrecognised'
    : 'settings.pairing.scan.wrongSession';

export const PairingCodeScanner = ({
  onPayload,
  scanner,
  requestCamera,
}: PairingCodeScannerProps) => {
  const { t } = useTranslation('screens');
  const collector = useRef(createQrPartCollector());
  const [progress, setProgress] = useState<QrCollectionProgress | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const handleScan = (symbol: string): void => {
    try {
      const next = collector.current.accept(symbol);
      setProblem(null);
      setProgress(next);
      if (next.text !== null) onPayload(next.text);
    } catch (error) {
      setProblem(problemKey(error));
    }
  };

  const incomplete = progress !== null && progress.text === null && progress.total !== null;

  return (
    <div className="flex flex-col gap-4" data-testid="pairing-code-scanner">
      <QrScanInput
        onScan={handleScan}
        scanner={scanner}
        requestCamera={requestCamera}
        cameraLabel={t('settings.pairing.scan.cameraLabel')}
        cameraStartLabel={t('settings.pairing.scan.cameraStartLabel')}
        cameraStopLabel={t('settings.pairing.scan.cameraStopLabel')}
        cameraScanningLabel={t('settings.pairing.scan.cameraScanningLabel')}
        cameraDeniedLabel={t('settings.pairing.scan.cameraDeniedLabel')}
        cameraUnavailableLabel={t('settings.pairing.scan.cameraUnavailableLabel')}
        fileLabel={t('settings.pairing.scan.fileLabel')}
        pasteLabel={t('settings.pairing.scan.pasteLabel')}
        submitLabel={t('settings.pairing.scan.submitLabel')}
        unreadableLabel={t('settings.pairing.scan.unreadableLabel')}
      />
      {incomplete && (
        <StatusGlyph kind="info" role="status" data-testid="pairing-scan-progress">
          {t('settings.pairing.scan.progress', {
            received: progress.received,
            total: progress.total,
            missing: progress.missing.join(', '),
          })}
        </StatusGlyph>
      )}
      {problem !== null && (
        <StatusGlyph kind="error" role="alert" data-testid="pairing-scan-problem">
          {t(problem)}
        </StatusGlyph>
      )}
    </div>
  );
};
