import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { routes } from '@/lib/routes';
import type { LockReason } from '@/lib/cloud/crypto/lockReason';

/** A caught space-creation failure, distinct from a live write lock. */
export type TemplatesSubmitError = 'locked' | 'failed' | null;

/** The notice variant: a live lock reason, a caught failure, or nothing. */
type NoticeVariant = 'mismatch' | 'keyless' | 'locked' | 'failed';

export interface TemplatesNoticeProps {
  lockReason: LockReason;
  submitError: TemplatesSubmitError;
}

const variantFor = (
  lockReason: LockReason,
  submitError: TemplatesSubmitError,
): NoticeVariant | null =>
  lockReason !== 'none' ? lockReason : submitError;

/**
 * The New-space notice: while the cloud write lock holds (mismatch/keyless) or a
 * submit was refused (`locked`), a warning banner names the reason and links to the
 * Account tab to resolve it; a generic `failed` shows an error banner. Renders
 * nothing when there is nothing to say.
 */
export const TemplatesNotice = ({ lockReason, submitError }: TemplatesNoticeProps) => {
  const { t } = useTranslation('screens');
  const navigate = useNavigate();
  const variant = variantFor(lockReason, submitError);
  if (!variant) return null;

  const k = (name: string) => t(`templates.lock.${name}`);
  return (
    <div className="mx-auto w-full max-w-4xl px-4 md:px-12">
      {variant === 'failed' ? (
        <InlineBanner
          kind="error"
          data-testid="templates-error-banner"
          title={k('failedTitle')}
        >
          {k('failedBody')}
        </InlineBanner>
      ) : (
        <InlineBanner
          kind="warning"
          data-testid="templates-lock-banner"
          title={k(`${variant}Title`)}
          action={k('action')}
          onAction={() => { void navigate(routes.settings('profile')); }}
        >
          {k(`${variant}Body`)}
        </InlineBanner>
      )}
    </div>
  );
};
