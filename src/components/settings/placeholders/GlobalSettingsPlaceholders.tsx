import { useTranslation } from 'react-i18next';
import { SettingRow } from '@/components/settings/SettingRow';
import { TabHeader } from '@/components/settings/TabHeader';
import { TypographyLabel } from '@/components/ui/typography';
import {
  PlaceholderAccentDots,
  PlaceholderChips,
  PlaceholderInput,
  PlaceholderSlider,
  PlaceholderSwatchRow,
  PlaceholderThemeCards,
  PlaceholderToggle,
} from './PlaceholderPrimitives';

export const GeneralPlaceholder = () => {
  const { t } = useTranslation('screens');
  return (
    <section>
      <TabHeader
        titleKey="settings.general.title"
        subtitleKey="settings.general.subtitle"
      />
      <SettingRow
        label={t('settings.general.compactDensityLabel')}
        hint={t('settings.general.compactDensityHint')}
      >
        <PlaceholderToggle />
      </SettingRow>
      <SettingRow
        label={t('settings.general.reduceMotionLabel')}
        hint={t('settings.general.reduceMotionHint')}
      >
        <PlaceholderToggle />
      </SettingRow>
      <SettingRow
        label={t('settings.general.keyboardHintsLabel')}
        hint={t('settings.general.keyboardHintsHint')}
      >
        <PlaceholderToggle on />
      </SettingRow>
      <SettingRow
        label={t('settings.general.startupLabel')}
        hint={t('settings.general.startupHint')}
      >
        <PlaceholderChips
          options={[
            t('settings.general.startupOptions.lastView'),
            t('settings.general.startupOptions.home'),
            t('settings.general.startupOptions.brainSpace'),
          ]}
          active={0}
        />
      </SettingRow>
    </section>
  );
};

export const AppearancePlaceholder = () => {
  const { t } = useTranslation('screens');
  return (
    <section>
      <TabHeader
        titleKey="settings.appearance.title"
        subtitleKey="settings.appearance.subtitle"
      />
      <div className="border-b border-rule/60 py-[18px]">
        <div className="mb-1 text-[13px] font-medium text-ink">
          {t('settings.appearance.themeLabel')}
        </div>
        <div className="mb-3 font-serif text-[12px] italic text-ink-3">
          {t('settings.appearance.themeHint')}
        </div>
        <PlaceholderThemeCards />
      </div>
      <SettingRow
        label={t('settings.appearance.accentLabel')}
        hint={t('settings.appearance.accentHint')}
      >
        <PlaceholderAccentDots />
      </SettingRow>
      <SettingRow label={t('settings.appearance.densityLabel')}>
        <PlaceholderChips
          options={[
            t('settings.appearance.densityOptions.cozy'),
            t('settings.appearance.densityOptions.default'),
            t('settings.appearance.densityOptions.compact'),
          ]}
          active={1}
        />
      </SettingRow>
    </section>
  );
};

export const TypographyPlaceholder = () => {
  const { t } = useTranslation('screens');
  return (
    <section>
      <TabHeader
        titleKey="settings.typography.title"
        subtitleKey="settings.typography.subtitle"
      />
      <SettingRow label={t('settings.typography.proseFontLabel')}>
        <PlaceholderChips
          options={['Source Serif 4', 'EB Garamond', 'Lora', 'Iowan']}
          active={0}
        />
      </SettingRow>
      <SettingRow label={t('settings.typography.uiFontLabel')}>
        <PlaceholderChips
          options={['Geist', 'Inter', 'IBM Plex', 'System']}
          active={0}
        />
      </SettingRow>
      <SettingRow
        label={t('settings.typography.proseSizeLabel')}
        hint={t('settings.typography.proseSizeHint')}
      >
        <PlaceholderSlider pct={60} v="17 px" />
      </SettingRow>
      <SettingRow label={t('settings.typography.lineHeightLabel')}>
        <PlaceholderChips options={['1.4', '1.55', '1.65', '1.8']} active={2} />
      </SettingRow>
      <SettingRow
        label={t('settings.typography.measureLabel')}
        hint={t('settings.typography.measureHint')}
      >
        <span className="font-serif text-[14px] text-ink">
          {t('settings.typography.measureValue')}
        </span>
      </SettingRow>
    </section>
  );
};

export const ShortcutsPlaceholder = () => {
  const { t } = useTranslation('screens');
  type Row = [string, string];
  const groups: [string, Row[]][] = [
    [
      t('settings.shortcuts.navHeader'),
      [
        [t('settings.shortcuts.items.openSettings'), '⌘ ,'],
        [t('settings.shortcuts.items.quickSettings'), '⌘ K'],
        [t('settings.shortcuts.items.findInDoc'), '⌘ F'],
        [t('settings.shortcuts.items.toggleFocus'), '⌘ .'],
        [t('settings.shortcuts.items.toggleInspector'), '⌘ I'],
      ],
    ],
    [
      t('settings.shortcuts.formatHeader'),
      [
        [t('settings.shortcuts.items.bold'), '⌘ B'],
        [t('settings.shortcuts.items.italic'), '⌘ I'],
        [t('settings.shortcuts.items.underline'), '⌘ U'],
        [t('settings.shortcuts.items.heading1'), '# →'],
        [t('settings.shortcuts.items.heading2'), '## →'],
      ],
    ],
    [
      t('settings.shortcuts.modeHeader'),
      [
        [t('settings.shortcuts.items.write'), '⌘ 1'],
        [t('settings.shortcuts.items.read'), '⌘ 2'],
        [t('settings.shortcuts.items.split'), '⌘ 3'],
      ],
    ],
  ];
  return (
    <section>
      <TabHeader
        titleKey="settings.shortcuts.title"
        subtitleKey="settings.shortcuts.subtitle"
      />
      {groups.map(([heading, rows], gi) => (
        <div key={gi} className="mb-8">
          <TypographyLabel asChild className="mb-2">
            <h3>{heading}</h3>
          </TypographyLabel>
          {rows.map(([label, kbd], i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b border-rule/60 py-2.5"
            >
              <span className="text-[13px] text-ink-2">{label}</span>
              <span className="font-mono text-[11px] text-ink">{kbd}</span>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
};

export const TemplatesPlaceholder = () => {
  const { t } = useTranslation('screens');
  const items: [string, string][] = [
    [t('settings.templates.items.fiction'), t('settings.templates.items.fictionSub')],
    [t('settings.templates.items.research'), t('settings.templates.items.researchSub')],
    [t('settings.templates.items.journal'), t('settings.templates.items.journalSub')],
    [t('settings.templates.items.essay'), t('settings.templates.items.essaySub')],
  ];
  return (
    <section>
      <TabHeader
        titleKey="settings.templates.title"
        subtitleKey="settings.templates.subtitle"
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map(([name, sub]) => (
          <div key={name} className="border border-rule p-4">
            <div className="font-serif text-[16px] font-medium tracking-tight text-ink">
              {name}
            </div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-3">
              {sub}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const PALETTE_ITEMS: [string, string][] = [
  ['evidence', '#fff3a8'],
  ['revise', '#ffd6e0'],
  ['reference', '#cfe3fa'],
  ['quote', '#d6ebcf'],
  ['loose', '#e8e8e8'],
];

export const PalettesPlaceholder = () => {
  const { t } = useTranslation('screens');
  return (
    <section>
      <TabHeader
        titleKey="settings.palettes.title"
        subtitleKey="settings.palettes.subtitle"
      />
      <div className="flex flex-col gap-2">
        {PALETTE_ITEMS.map(([key, c]) => (
          <PlaceholderSwatchRow
            key={key}
            name={t(`settings.palettes.items.${key}`)}
            color={c}
            rename={t('settings.palettes.rename')}
            tune={t('settings.palettes.tune')}
          />
        ))}
      </div>
    </section>
  );
};

export const CitationsPlaceholder = () => {
  const { t } = useTranslation('screens');
  return (
    <section>
      <TabHeader
        titleKey="settings.citations.title"
        subtitleKey="settings.citations.subtitle"
      />
      <SettingRow
        label={t('settings.citations.styleLabel')}
        hint={t('settings.citations.styleHint')}
      >
        <PlaceholderChips
          options={[
            t('settings.citations.options.chicago'),
            t('settings.citations.options.apa'),
            t('settings.citations.options.mla'),
            t('settings.citations.options.ieee'),
          ]}
          active={0}
        />
      </SettingRow>
    </section>
  );
};

export const AnnotationPlaceholder = () => {
  const { t } = useTranslation('screens');
  return (
    <section>
      <TabHeader
        titleKey="settings.annotation.title"
        subtitleKey="settings.annotation.subtitle"
      />
      <SettingRow
        label={t('settings.annotation.showMarginLabel')}
        hint={t('settings.annotation.showMarginHint')}
      >
        <PlaceholderToggle on />
      </SettingRow>
      <SettingRow
        label={t('settings.annotation.showInlineLabel')}
        hint={t('settings.annotation.showInlineHint')}
      >
        <PlaceholderToggle on />
      </SettingRow>
      <SettingRow
        label={t('settings.annotation.exportLabel')}
        hint={t('settings.annotation.exportHint')}
      >
        <PlaceholderToggle />
      </SettingRow>
    </section>
  );
};

export const ExportPlaceholder = () => {
  const { t } = useTranslation('screens');
  return (
    <section>
      <TabHeader
        titleKey="settings.export.title"
        subtitleKey="settings.export.subtitle"
      />
      <SettingRow
        label={t('settings.export.formatLabel')}
        hint={t('settings.export.formatHint')}
      >
        <PlaceholderChips
          options={[
            t('settings.export.formats.markdown'),
            t('settings.export.formats.html'),
            t('settings.export.formats.pdf'),
            t('settings.export.formats.docx'),
            t('settings.export.formats.latex'),
          ]}
          active={0}
        />
      </SettingRow>
      <SettingRow
        label={t('settings.export.importLabel')}
        hint={t('settings.export.importHint')}
      >
        <PlaceholderChips
          options={[
            t('settings.export.importOptions.bundle'),
            t('settings.export.importOptions.markdown'),
            t('settings.export.importOptions.obsidian'),
          ]}
          active={0}
        />
      </SettingRow>
    </section>
  );
};

export const DataPlaceholder = () => {
  const { t } = useTranslation('screens');
  return (
    <section>
      <TabHeader
        titleKey="settings.data.title"
        subtitleKey="settings.data.subtitle"
      />
      <SettingRow label={t('settings.data.storageLabel')}>
        <span className="font-serif text-[14px] text-ink">
          {t('settings.data.storageValue')}
        </span>
      </SettingRow>
      <SettingRow label={t('settings.data.engineLabel')}>
        <span className="font-serif text-[14px] text-ink">
          {t('settings.data.engineValue')}
        </span>
      </SettingRow>
      <SettingRow
        label={t('settings.data.wipeLabel')}
        hint={t('settings.data.wipeHint')}
      >
        <span className="inline-block border border-ink px-3 py-1.5 text-[12px] font-medium text-ink">
          {t('settings.data.wipeButton')}
        </span>
      </SettingRow>
    </section>
  );
};

export const AccountPlaceholder = () => {
  const { t } = useTranslation('screens');
  return (
    <section>
      <TabHeader
        titleKey="settings.account.title"
        subtitleKey="settings.account.subtitle"
      />
      <SettingRow
        label={t('settings.account.signedOutLabel')}
        hint={t('settings.account.signedOutHint')}
      >
        <span className="inline-block border border-ink px-3 py-1.5 text-[12px] font-medium text-ink">
          {t('settings.account.signInButton')}
        </span>
      </SettingRow>
      <SettingRow
        label={t('settings.account.syncLabel')}
        hint={t('settings.account.syncHint')}
      >
        <PlaceholderToggle />
      </SettingRow>
    </section>
  );
};

export const AboutPlaceholder = () => {
  const { t } = useTranslation('screens');
  return (
    <section>
      <TabHeader
        titleKey="settings.about.title"
        subtitleKey="settings.about.subtitle"
      />
      <SettingRow label={t('settings.about.versionLabel')}>
        <span className="font-serif text-[14px] text-ink">
          {t('settings.about.versionValue')}
        </span>
      </SettingRow>
      <SettingRow label={t('settings.about.buildLabel')}>
        <span className="font-serif text-[14px] text-ink">
          {t('settings.about.buildValue')}
        </span>
      </SettingRow>
      <SettingRow label={t('settings.about.licenseLabel')}>
        <span className="font-serif text-[14px] text-ink">
          {t('settings.about.licenseValue')}
        </span>
      </SettingRow>
      <SettingRow label={t('settings.about.linksLabel')}>
        <div className="flex flex-wrap items-center gap-4">
          <span className="border-b border-ink pb-px text-[13px] text-ink">
            {t('settings.about.links.source')}
          </span>
          <span className="border-b border-ink pb-px text-[13px] text-ink">
            {t('settings.about.links.changelog')}
          </span>
          <span className="border-b border-ink pb-px text-[13px] text-ink">
            {t('settings.about.links.feedback')}
          </span>
        </div>
      </SettingRow>
    </section>
  );
};

export const BackupsPlaceholder = () => {
  const { t } = useTranslation('screens');
  return (
    <section>
      <TabHeader
        titleKey="settings.backups.title"
        subtitleKey="settings.backups.subtitle"
      />
      <SettingRow label={t('settings.backups.intervalLabel')}>
        <PlaceholderChips
          options={[
            t('settings.backups.intervalOptions.5min'),
            t('settings.backups.intervalOptions.10min'),
            t('settings.backups.intervalOptions.30min'),
            t('settings.backups.intervalOptions.off'),
          ]}
          active={1}
        />
      </SettingRow>
      <SettingRow
        label={t('settings.backups.keepLabel')}
        hint={t('settings.backups.keepHint')}
      >
        <PlaceholderChips
          options={[
            t('settings.backups.keepOptions.last50'),
            t('settings.backups.keepOptions.days7'),
            t('settings.backups.keepOptions.days30'),
          ]}
          active={1}
        />
      </SettingRow>
      <SettingRow label={t('settings.backups.latestLabel')}>
        <span className="font-serif text-[14px] text-ink">
          {t('settings.backups.latestValue')}
        </span>
      </SettingRow>
    </section>
  );
};

export { PlaceholderInput };
