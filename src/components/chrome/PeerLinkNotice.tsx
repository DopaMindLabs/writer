import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { NoticeDock } from '@/components/ui/NoticeDock';
import { usePeerLinkDropped } from '@/hooks/usePeerLinkDropped';
import { routes } from '@/lib/routes';

/**
 * Says so, once, when a paired device that *was* connected stops being.
 *
 * Self-gating: it renders nothing unless a link was lost during this page's
 * life. A device that has never connected — every fresh start, every reload —
 * is the resting state, and a notice about it would appear on every launch and
 * mean nothing.
 *
 * It never interrupts. No dialog, no toast, no focus taken: it appears in the
 * dock, out of the flow, so a sentence being typed neither moves nor loses the
 * caret. `InlineBanner` announces itself through `role="status"`, which is
 * polite — read at the next pause rather than over whatever is being said — and
 * is what keeps the feature perceivable at all to a screen-reader user.
 *
 * The action goes to the device list rather than reconnecting on the spot,
 * because reconnecting is not something this device can do alone: with no
 * signalling channel left, a fresh QR exchange is the only route back, and it
 * needs both devices.
 */
export const PeerLinkNotice = () => {
  const { t } = useTranslation('chrome');
  const navigate = useNavigate();
  const dropped = usePeerLinkDropped();

  if (!dropped) return null;

  return (
    <NoticeDock>
      <InlineBanner
        kind="warning"
        data-testid="peer-link-notice"
        title={t('peerLink.droppedTitle')}
        action={t('peerLink.droppedAction')}
        onAction={() => {
          void navigate(routes.settings('deviceSync'));
        }}
      >
        {t('peerLink.droppedBody')}
      </InlineBanner>
    </NoticeDock>
  );
};
