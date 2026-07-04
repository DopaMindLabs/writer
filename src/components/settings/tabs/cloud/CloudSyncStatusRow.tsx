import { useTranslation } from 'react-i18next';
import { StatusGlyph } from '@/components/ui/StatusGlyph';
import type { StatusKind } from '@/components/ui/statusRole';
import { assertNever } from '@/lib/invariant';
import type { CloudSyncPhase } from '@/lib/cloud/cloudClient';

export interface CloudSyncStatusRowProps {
  phase: CloudSyncPhase;
  message?: string;
}

/** Map a sync phase to its status glyph kind and copy key (exhaustive). */
const phaseMeta = (phase: CloudSyncPhase): { kind: StatusKind; key: string } => {
  switch (phase) {
    case 'in-sync':
      return { kind: 'success', key: 'inSync' };
    case 'pushing':
      return { kind: 'info', key: 'pushing' };
    case 'pulling':
      return { kind: 'info', key: 'pulling' };
    case 'initial':
      return { kind: 'info', key: 'initial' };
    case 'offline':
      return { kind: 'warning', key: 'offline' };
    case 'not-in-sync':
      return { kind: 'warning', key: 'notInSync' };
    case 'error':
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
        {phase === 'error' && message ? `${label}: ${message}` : label}
      </StatusGlyph>
    </div>
  );
};
