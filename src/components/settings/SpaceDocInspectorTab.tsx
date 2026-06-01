import { useTranslation } from 'react-i18next';
import type { Space } from '@/db/schema';
import { TabHeader } from '@/components/settings/TabHeader';
import { SettingRow } from '@/components/settings/SettingRow';
import { InspectorToggleSelector } from '@/components/settings/InspectorToggleSelector';
import { INSPECTOR_TOGGLE_ROWS } from '@/components/settings/docInspectorRows';
import { useEffectiveInspectorConfig } from '@/hooks/useDocInspectorConfig';
import { setSpaceToggle } from '@/lib/docInspector/config';

export const SpaceDocInspectorTab = ({ space }: { space: Space }) => {
  const { t } = useTranslation('screens');
  const { own, global } = useEffectiveInspectorConfig(space.id);
  return (
    <section data-testid="space-settings-doc-inspector">
      <TabHeader
        titleKey="settings.space.docInspector.title"
        subtitleKey="settings.space.docInspector.subtitle"
        breadcrumbKey="settings.space.breadcrumb"
      />
      {INSPECTOR_TOGGLE_ROWS.map((row) => {
        const label = t(`settings.docInspector.${row.labelKey}`);
        const value = own?.[row.key] ?? 'inherit';
        const defaultOn = global[row.key] !== 'off';
        return (
          <SettingRow
            key={row.key}
            label={label}
            hint={t(`settings.docInspector.${row.hintKey}`)}
          >
            <InspectorToggleSelector
              value={value}
              defaultOn={defaultOn}
              ariaLabel={label}
              onChange={(next) => {
                void setSpaceToggle(space.id, row.key, next);
              }}
            />
          </SettingRow>
        );
      })}
    </section>
  );
};
