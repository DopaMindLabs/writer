import { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { splitIntoQrParts } from 'writer-sync/pairing';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { Label } from '@/components/ui/Label';
import { QrCode } from '@/components/ui/QrCode';
import { TextArea } from '@/components/ui/TextArea';
import { PairingCodePager } from './PairingCodePager';

/**
 * One device's half of the pairing exchange, shown for the other device to read.
 *
 * A complete session description does not always fit one symbol, so the payload
 * is split into a bounded sequence and stepped through by hand. The same payload
 * is offered as selectable text beneath: that path needs no camera at all, which
 * is what keeps the flow usable when the camera is declined, absent or
 * unsupported rather than merely degraded.
 */

export interface PairingCodeDisplayProps {
  /** The encoded payload text a peer must read back. */
  payload: string;
  /** Ties every symbol to this session, so a stray scan is recognisable. */
  sessionId: string;
  kind: 'offer' | 'answer';
}

export const PairingCodeDisplay = ({
  payload,
  sessionId,
  kind,
}: PairingCodeDisplayProps) => {
  const { t } = useTranslation('screens');
  const [requested, setRequested] = useState(0);
  const payloadFieldId = useId();

  // A payload over the symbol ceiling is a protocol-level failure, not a
  // rendering one: there is no smaller thing to draw, so it is reported.
  const parts = useMemo(() => {
    try {
      return splitIntoQrParts({ sessionId, text: payload });
    } catch {
      return null;
    }
  }, [payload, sessionId]);

  if (parts === null) {
    return (
      <InlineBanner kind="error" data-testid="pairing-code-too-large">
        {t('settings.pairing.tooLarge')}
      </InlineBanner>
    );
  }

  const index = Math.min(requested, parts.length - 1);

  return (
    <div className="flex flex-col gap-4" data-testid="pairing-code-display">
      <div className="w-64 max-w-full self-center text-ink">
        <QrCode
          value={parts.at(index) ?? payload}
          label={t(`settings.pairing.qrLabel.${kind}`)}
          unencodableLabel={t('settings.pairing.tooLarge')}
        />
      </div>
      {parts.length > 1 && (
        <PairingCodePager index={index} total={parts.length} onChange={setRequested} />
      )}
      <div className="flex flex-col gap-1">
        <Label htmlFor={payloadFieldId} tone="ink2">
          {t('settings.pairing.payloadLabel')}
        </Label>
        <TextArea
          id={payloadFieldId}
          readOnly
          value={payload}
          rows={3}
          data-testid="pairing-code-payload"
        />
      </div>
    </div>
  );
};
