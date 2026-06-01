import { useTranslation } from 'react-i18next';
import { TabHeader } from '@/components/settings/TabHeader';
import { SettingRow } from '@/components/settings/SettingRow';
import { INSPECTOR_TOGGLE_ROWS } from '@/components/settings/docInspectorRows';
import { PillToggle } from '@/components/ui/PillToggle';
import { Chip } from '@/components/ui/Chip';
import { useGlobalInspectorConfig } from '@/hooks/useDocInspectorConfig';
import {
  setGlobalToggle,
  setStatusStageEnabled,
} from '@/lib/docInspector/config';
import { DOC_STATUS_STAGES } from '@/lib/docInspector/status';
import type { DocInspectorConfig } from '@/db/schema';

const StatusStagesRow = ({ global }: { global: DocInspectorConfig }) => {
  const { t } = useTranslation(['screens', 'chrome']);
  const label = t('settings.docInspector.statusStagesLabel');
  return (
    <SettingRow label={label} hint={t('settings.docInspector.statusStagesHint')}>
      <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
        {DOC_STATUS_STAGES.map((stage) => {
          const on = global.statusStages?.[stage.id] ?? stage.enabledByDefault;
          return (
            <Chip
              key={stage.id}
              active={on}
              data-testid={`stage-${stage.id}`}
              onClick={() => {
                void setStatusStageEnabled(stage.id, !on);
              }}
            >
              {t(`inspector.status.${stage.id}`, { ns: 'chrome' })}
            </Chip>
          );
        })}
      </div>
    </SettingRow>
  );
};

export const DocInspectorTab = () => {
  const { t } = useTranslation('screens');
  const global = useGlobalInspectorConfig();
  return (
    <section data-testid="settings-doc-inspector">
      <TabHeader
        titleKey="settings.docInspector.title"
        subtitleKey="settings.docInspector.subtitle"
      />
      {INSPECTOR_TOGGLE_ROWS.map((row) => {
        const label = t(`settings.docInspector.${row.labelKey}`);
        const on = global[row.key] !== 'off';
        return (
          <SettingRow
            key={row.key}
            label={label}
            hint={t(`settings.docInspector.${row.hintKey}`)}
          >
            <PillToggle
              on={on}
              label={label}
              data-testid={`toggle-${row.key}`}
              onToggle={() => {
                void setGlobalToggle(row.key, !on);
              }}
            />
          </SettingRow>
        );
      })}
      <StatusStagesRow global={global} />
    </section>
  );
};
