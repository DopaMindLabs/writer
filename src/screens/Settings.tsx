import type { ReactElement } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUI } from '@/store/ui';
import { SettingsShell } from '@/components/settings/SettingsShell';
import type { SettingsTabGroup } from '@/components/settings/SettingsTabs';
import { SettingRow } from '@/components/settings/SettingRow';
import { Chip } from '@/components/ui/Chip';
import { ComingSoon } from '@/components/settings/ComingSoon';
import { ComingSoonRow } from '@/components/settings/ComingSoonRow';
import { TabHeader } from '@/components/settings/TabHeader';
import { SyncTab } from '@/components/settings/SyncTab';
import { AccessibilityTab } from '@/components/settings/tabs/AccessibilityTab';
import {
  GeneralPlaceholder,
  AppearancePlaceholder,
  TypographyPlaceholder,
  ShortcutsPlaceholder,
  PalettesPlaceholder,
  CitationsPlaceholder,
  AnnotationPlaceholder,
  ExportPlaceholder,
  DataPlaceholder,
  AccountPlaceholder,
  AboutPlaceholder,
  BackupsPlaceholder,
} from '@/components/settings/placeholders/GlobalSettingsPlaceholders';

const TAB_IDS = [
  'general',
  'appearance',
  'typography',
  'editor',
  'accessibility',
  'shortcuts',
  'palettes',
  'citations',
  'annotation',
  'backups',
  'sync',
  'export',
  'data',
  'account',
  'about',
] as const;
type TabId = (typeof TAB_IDS)[number];
type PlaceholderTabId = Exclude<TabId, 'editor' | 'sync' | 'accessibility'>;

const isTabId = (value: string | null): value is TabId =>
  value !== null && (TAB_IDS as readonly string[]).includes(value);

const PLACEHOLDERS: Record<PlaceholderTabId, () => ReactElement> = {
  general: GeneralPlaceholder,
  appearance: AppearancePlaceholder,
  typography: TypographyPlaceholder,
  shortcuts: ShortcutsPlaceholder,
  palettes: PalettesPlaceholder,
  citations: CitationsPlaceholder,
  annotation: AnnotationPlaceholder,
  export: ExportPlaceholder,
  data: DataPlaceholder,
  account: AccountPlaceholder,
  about: AboutPlaceholder,
  backups: BackupsPlaceholder,
};

type TFn = (key: string) => string;

const GROUP_TABS: { group: string; tabs: readonly TabId[] }[] = [
  {
    group: 'preferences',
    tabs: [
      'general',
      'appearance',
      'typography',
      'editor',
      'accessibility',
      'shortcuts',
    ],
  },
  { group: 'writing', tabs: ['palettes', 'citations', 'annotation'] },
  { group: 'data', tabs: ['backups', 'sync', 'export', 'data'] },
  { group: 'account', tabs: ['account', 'about'] },
];

const buildGroups = (t: TFn): SettingsTabGroup[] =>
  GROUP_TABS.map(({ group, tabs }) => ({
    label: t(`settings.groups.${group}`),
    tabs: tabs.map((id) => ({ id, label: t(`settings.tabs.${id}`) })),
  }));

export const SettingsScreen = () => {
  const { t } = useTranslation(['screens', 'chrome', 'common']);
  const [params, setParams] = useSearchParams();
  const rawTab = params.get('tab');
  const activeTab: TabId = isTabId(rawTab) ? rawTab : 'editor';

  const groups = buildGroups(t);

  const selectTab = (id: string) => {
    const next = new URLSearchParams(params);
    next.set('tab', id);
    setParams(next, { replace: false });
  };

  return (
    <SettingsShell
      variant="global"
      groups={groups}
      active={activeTab}
      onSelect={selectTab}
    >
      {activeTab === 'editor' ? (
        <EditorTab />
      ) : activeTab === 'accessibility' ? (
        <AccessibilityTab />
      ) : activeTab === 'sync' ? (
        <SyncTab />
      ) : (
        <PlaceholderTab id={activeTab} />
      )}
    </SettingsShell>
  );
};

const EditorTab = () => {
  const { t } = useTranslation('screens');
  const floatingToolbarEnabled = useUI((s) => s.floatingToolbarEnabled);
  const setFloatingToolbarEnabled = useUI((s) => s.setFloatingToolbarEnabled);

  return (
    <section>
      <TabHeader
        titleKey="settings.editor.title"
        subtitleKey="settings.editor.subtitle"
      />

      <SettingRow
        label={t('settings.editor.floatingToolbarLabel')}
        hint={t('settings.editor.floatingToolbarHint')}
      >
        <div className="flex gap-2">
          <Chip
            active={!floatingToolbarEnabled}
            onClick={() => { setFloatingToolbarEnabled(false); }}
          >
            {t('settings.editor.floatingToolbarOff')}
          </Chip>
          <Chip
            active={floatingToolbarEnabled}
            onClick={() => { setFloatingToolbarEnabled(true); }}
          >
            {t('settings.editor.floatingToolbarOn')}
          </Chip>
        </div>
      </SettingRow>

      <ComingSoonRow
        label={t('settings.editor.rightClickLabel')}
        hint={t('settings.editor.rightClickHint')}
        tooltip={t('settings.editor.rightClickTooltip')}
      />
      <ComingSoonRow
        label={t('settings.editor.inlineTogglesLabel')}
        hint={t('settings.editor.inlineTogglesHint')}
        tooltip={t('settings.editor.inlineTogglesTooltip')}
      />
      <ComingSoonRow
        label={t('settings.editor.listDepthLabel')}
        hint={t('settings.editor.listDepthHint')}
        tooltip={t('settings.editor.listDepthTooltip')}
      />
      <ComingSoonRow
        label={t('settings.editor.templateDefaultsLabel')}
        hint={t('settings.editor.templateDefaultsHint')}
        tooltip={t('settings.editor.templateDefaultsTooltip')}
      />
    </section>
  );
};

const PlaceholderTab = ({ id }: { id: PlaceholderTabId }) => {
  const Body = PLACEHOLDERS[id];
  return (
    <ComingSoon overlay>
      <Body />
    </ComingSoon>
  );
};
