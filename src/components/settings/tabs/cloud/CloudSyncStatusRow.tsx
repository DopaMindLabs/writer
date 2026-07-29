import { useTranslation } from 'react-i18next';
import { StatusGlyph } from '@/components/ui/StatusGlyph';
import type { StatusKind } from '@/components/ui/statusRole';
import { assertNever } from '@/lib/invariant';
import { SyncPhase } from '@/lib/syncProviders/types';

export interface CloudSyncStatusRowProps {
  phase: SyncPhase;
  message?: string;
}

/** Map a sync phase to its status glyph kind and copy key (exhaustive). */
const phaseMeta = (phase: SyncPhase): { kind: StatusKind; key: string } => {
  switch (phase) {
    case SyncPhase.InSync:
      return { kind: 'success', key: 'inSync' };
    case SyncPhase.Pushing:
      return { kind: 'info', key: 'pushing' };
    case SyncPhase.Pulling:
      return { kind: 'info', key: 'pulling' };
    case SyncPhase.Initial:
      return { kind: 'info', key: 'initial' };
    case SyncPhase.Offline:
      return { kind: 'warning', key: 'offline' };
    case SyncPhase.Pending:
      return { kind: 'warning', key: 'notInSync' };
    case SyncPhase.Error:
      return { kind: 'error', key: 'error' };
    default:
      return assertNever(phase);
  }
};

/** A one-line sync-status row: the label plus a phase-coloured status glyph. */
export const CloudSyncStatusRow = ({ phase, message }: CloudSyncStatusRowProps) => {
  const { t } = useTranslation('screens');
  const { kind, key } = phaseMeta(phase);
  const label = t(`settings.account.cloud.status.${key}`);
  return (
    <div
      data-testid="cloud-sync-status"
      className="flex items-center justify-between gap-4 border-b border-rule/60 py-4"
    >
      <span className="text-[14px] font-medium text-ink">
        {t('settings.account.cloud.status.label')}
      </span>
      <StatusGlyph kind={kind} mono={false}>
        {phase === SyncPhase.Error && message ? `${label}: ${message}` : label}
      </StatusGlyph>
    </div>
  );
};
