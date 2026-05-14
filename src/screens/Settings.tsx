import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUI, type Theme } from '@/store/ui';
import { PageNav } from '@/components/chrome/PageNav';
import { SettingsTabs, type SettingsTabDef } from '@/components/settings/SettingsTabs';
import { SettingRow } from '@/components/settings/SettingRow';
import { Chip } from '@/components/settings/Chip';
import { ComingSoonRow } from '@/components/settings/ComingSoonRow';
import { TabHeader } from '@/components/settings/TabHeader';

const TAB_IDS = [
  'editor',
  'account',
  'typography',
  'theme',
  'shortcuts',
  'backups',
] as const;
type TabId = (typeof TAB_IDS)[number];

function isTabId(value: string | null): value is TabId {
  return value !== null && (TAB_IDS as readonly string[]).includes(value);
}

export function SettingsScreen() {
  const { t } = useTranslation(['screens', 'chrome', 'common']);
  const [params, setParams] = useSearchParams();
  const rawTab = params.get('tab');
  const activeTab: TabId = isTabId(rawTab) ? rawTab : 'editor';

  const tabs: SettingsTabDef[] = TAB_IDS.map((id) => ({
    id,
    label: t(`settings.tabs.${id}`),
  }));

  function selectTab(id: string) {
    const next = new URLSearchParams(params);
    next.set('tab', id);
    setParams(next, { replace: false });
  }

  return (
    <div className="flex h-full w-full flex-col bg-paper text-ink">
      <PageNav />

      <div className="flex min-h-0 flex-1">
        <SettingsTabs tabs={tabs} active={activeTab} onSelect={selectTab} />
        <main className="flex-1 overflow-auto bg-paper px-10 py-8">
          {activeTab === 'editor' && <EditorTab />}
          {activeTab === 'theme' && <ThemeTab />}
          {activeTab === 'account' && <PlaceholderTab id="account" />}
          {activeTab === 'typography' && <PlaceholderTab id="typography" />}
          {activeTab === 'shortcuts' && <PlaceholderTab id="shortcuts" />}
          {activeTab === 'backups' && <PlaceholderTab id="backups" />}
        </main>
      </div>
    </div>
  );
}

function EditorTab() {
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
            onClick={() => setFloatingToolbarEnabled(false)}
          >
            {t('settings.editor.floatingToolbarOff')}
          </Chip>
          <Chip
            active={floatingToolbarEnabled}
            onClick={() => setFloatingToolbarEnabled(true)}
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
}

const THEME_OPTIONS: { id: Theme; labelKey: string }[] = [
  { id: 'light', labelKey: 'chrome:topbar.themes.light' },
  { id: 'dark', labelKey: 'chrome:topbar.themes.dark' },
  { id: 'hc-light', labelKey: 'chrome:topbar.themes.hcLight' },
  { id: 'hc-dark', labelKey: 'chrome:topbar.themes.hcDark' },
];

function ThemeTab() {
  const { t } = useTranslation(['screens', 'chrome']);
  const theme = useUI((s) => s.theme);
  const setTheme = useUI((s) => s.setTheme);

  return (
    <section>
      <TabHeader
        titleKey="settings.theme.title"
        subtitleKey="settings.theme.subtitle"
      />
      <SettingRow
        label={t('settings.theme.rowLabel')}
        hint={t('settings.theme.rowHint')}
      >
        <div className="flex flex-wrap gap-2">
          {THEME_OPTIONS.map((opt) => (
            <Chip
              key={opt.id}
              active={theme === opt.id}
              onClick={() => setTheme(opt.id)}
            >
              {t(opt.labelKey)}
            </Chip>
          ))}
        </div>
      </SettingRow>
    </section>
  );
}

type PlaceholderTabId = 'account' | 'typography' | 'shortcuts' | 'backups';

function PlaceholderTab({ id }: { id: PlaceholderTabId }) {
  const { t } = useTranslation('screens');
  return (
    <section>
      <TabHeader
        titleKey={`settings.${id}.title`}
        subtitleKey={`settings.${id}.subtitle`}
      />
      <div className="mx-auto mt-8 max-w-md border border-dashed border-rule bg-paper-2/40 p-8 text-center">
        <div className="inline-block rounded-sm bg-paper-2 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-ink-3">
          {t('settings.comingSoonBadge')}
        </div>
        <p className="mt-4 font-serif text-[14px] italic text-ink-2">
          {t(`settings.${id}.comingSoonBody`)}
        </p>
      </div>
    </section>
  );
}
