import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useUI } from '@/store/ui';
import { SettingsShell } from '@/components/settings/SettingsShell';
import type { SettingsTabGroup } from '@/components/settings/SettingsTabs';
import { SettingsSectionStack } from '@/components/settings/SettingsSectionStack';
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

const GROUPED_TABS: { label: string; ids: readonly TabId[] }[] = [
  {
    label: 'preferences',
    ids: [
      'general',
      'appearance',
      'typography',
      'editor',
      'accessibility',
      'shortcuts',
    ],
  },
  { label: 'writing', ids: ['palettes', 'citations', 'annotation'] },
  { label: 'data', ids: ['backups', 'sync', 'export', 'data'] },
  { label: 'account', ids: ['account', 'about'] },
];

const buildGroups = (t: TFunction): SettingsTabGroup[] =>
  GROUPED_TABS.map((group) => ({
    label: t(`settings.groups.${group.label}`),
    tabs: group.ids.map((id) => ({ id, label: t(`settings.tabs.${id}`) })),
  }));

const renderSection = (id: TabId): ReactElement => {
  if (id === 'editor') return <EditorTab />;
  if (id === 'accessibility') return <AccessibilityTab />;
  if (id === 'sync') return <SyncTab />;
  return <PlaceholderTab id={id} />;
};

export const SettingsScreen = () => {
  const { t } = useTranslation(['screens', 'chrome', 'common']);
  const [params, setParams] = useSearchParams();
  const rawTab = params.get('tab');
  const activeTab: TabId = isTabId(rawTab) ? rawTab : 'editor';
  const [visibleId, setVisibleId] = useState<string>(activeTab);
  const [scrollNonce, setScrollNonce] = useState(0);

  const groups = buildGroups(t);
  const activeGroup =
    groups.find((g) => g.tabs.some((tab) => tab.id === activeTab)) ?? groups[0];
  const sectionIds = activeGroup.tabs.map((tab) => tab.id);
  const sections = sectionIds.map((id) => ({
    id,
    node: renderSection(id as TabId),
  }));
  const active = sectionIds.includes(visibleId) ? visibleId : activeTab;

  // Keep the highlight in sync when the group changes (deep links, back/forward).
  useEffect(() => {
    setVisibleId(activeTab);
  }, [activeTab]);

  const selectTab = (id: string) => {
    const next = new URLSearchParams(params);
    next.set('tab', id);
    setParams(next, { replace: false });
    setVisibleId(id);
    setScrollNonce((n) => n + 1);
  };

  return (
    <SettingsShell
      variant="global"
      groups={groups}
      active={active}
      onSelect={selectTab}
    >
      <SettingsSectionStack
        sections={sections}
        scrollTarget={activeTab}
        scrollNonce={scrollNonce}
        onVisibleChange={setVisibleId}
      />
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
