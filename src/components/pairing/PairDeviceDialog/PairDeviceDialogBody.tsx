import { useTranslation } from 'react-i18next';
import type { QrScanner } from 'writer-qr/scan';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { StatusGlyph } from '@/components/ui/StatusGlyph';
import { PairingRoleChoice } from '@/components/pairing/PairingRoleChoice/PairingRoleChoice';
import { PairingVerification } from '@/components/pairing/PairingVerification/PairingVerification';
import { InitiatorPairingView } from './InitiatorPairingView';
import { JoinerPairingView } from './JoinerPairingView';
import type { PairingExchange } from './usePairingExchange';

/**
 * What the dialog shows for the phase the exchange is in.
 *
 * Separated from the dialog frame so each stays one readable unit: the frame
 * owns the modal, this owns the flow. The phases every role shares live here;
 * the two that differ delegate to a view of their own rather than growing a
 * second dimension of branching in one component.
 */

export interface PairDeviceDialogBodyProps {
  exchange: PairingExchange;
  /** Injected in tests and stories; defaults to the real detector. */
  scanner?: QrScanner;
}

export const PairDeviceDialogBody = ({ exchange, scanner }: PairDeviceDialogBodyProps) => {
  const { t } = useTranslation('screens');

  if (exchange.phase === 'choosing') {
    return <PairingRoleChoice onChoose={exchange.begin} />;
  }

  if (exchange.phase === 'creating') {
    return (
      <StatusGlyph kind="info" role="status" data-testid="pair-device-gathering">
        {t('settings.pairing.creating')}
      </StatusGlyph>
    );
  }

  if (exchange.phase === 'failed') {
    return (
      <InlineBanner kind="error" data-testid="pair-device-failed">
        {t('settings.pairing.failed')}
      </InlineBanner>
    );
  }

  if (exchange.phase === 'authenticating') {
    return (
      <StatusGlyph kind="info" role="status" data-testid="pair-device-authenticating">
        {t('settings.pairing.authenticating')}
      </StatusGlyph>
    );
  }

  if (exchange.phase === 'complete') {
    return (
      <InlineBanner
        kind="success"
        title={t('settings.pairing.complete.title')}
        data-testid="pair-device-complete"
      >
        {t('settings.pairing.complete.body')}
      </InlineBanner>
    );
  }

  if (exchange.role === 'joiner') {
    return <JoinerPairingView exchange={exchange} scanner={scanner} />;
  }

  if (exchange.phase === 'awaiting-confirmation' && exchange.peer !== null) {
    return (
      <PairingVerification
        code={exchange.peer.verificationCode}
        onConfirm={exchange.confirm}
      />
    );
  }

  return <InitiatorPairingView exchange={exchange} scanner={scanner} />;
};
