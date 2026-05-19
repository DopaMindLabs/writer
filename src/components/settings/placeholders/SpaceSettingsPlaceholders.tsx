import { useTranslation } from 'react-i18next';
import { SettingRow } from '@/components/settings/SettingRow';
import { TabHeader } from '@/components/settings/TabHeader';
import {
  PlaceholderChips,
  PlaceholderInput,
  PlaceholderSwatchRow,
} from './PlaceholderPrimitives';

const PALETTE_ITEMS: [string, string][] = [
  ['evidence', '#fff3a8'],
  ['revise', '#ffd6e0'],
  ['reference', '#cfe3fa'],
  ['quote', '#d6ebcf'],
  ['loose', '#e8e8e8'],
];

export function SpaceTemplatePlaceholder() {
  const { t } = useTranslation('screens');
  return (
    <section>
      <TabHeader
        titleKey="settings.space.template.title"
        subtitleKey="settings.space.template.subtitle"
        breadcrumbKey="settings.space.breadcrumb"
      />
      <SettingRow label={t('settings.space.template.currentLabel')}>
        <div>
          <div className="font-serif text-[15px] font-medium text-ink">
            {t('settings.space.template.currentValue')}
          </div>
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-3">
            {t('settings.space.template.currentSub')}
          </div>
        </div>
      </SettingRow>
      <SettingRow
        label={t('settings.space.template.changeLabel')}
        hint={t('settings.space.template.changeHint')}
      >
        <span className="inline-block border border-ink px-3 py-1.5 text-[12px] font-medium text-ink">
          {t('settings.space.template.changeButton')}
        </span>
      </SettingRow>
    </section>
  );
}

export function SpacePalettePlaceholder() {
  const { t } = useTranslation('screens');
  return (
    <section>
      <TabHeader
        titleKey="settings.space.palette.title"
        subtitleKey="settings.space.palette.subtitle"
        breadcrumbKey="settings.space.breadcrumb"
      />
      <div className="flex flex-col gap-2">
        {PALETTE_ITEMS.map(([key, c]) => (
          <PlaceholderSwatchRow
            key={key}
            name={t(`settings.space.palette.items.${key}`)}
            color={c}
            rename={t('settings.space.palette.rename')}
            tune={t('settings.space.palette.tune')}
          />
        ))}
      </div>
    </section>
  );
}

export function SpaceSharingPlaceholder() {
  const { t } = useTranslation('screens');
  return (
    <section>
      <TabHeader
        titleKey="settings.space.sharing.title"
        subtitleKey="settings.space.sharing.subtitle"
        breadcrumbKey="settings.space.breadcrumb"
      />
      <SettingRow label={t('settings.space.sharing.visibilityLabel')}>
        <PlaceholderChips
          options={[
            t('settings.space.sharing.visibilityOptions.private'),
            t('settings.space.sharing.visibilityOptions.link'),
            t('settings.space.sharing.visibilityOptions.members'),
          ]}
          active={0}
        />
      </SettingRow>
      <SettingRow
        label={t('settings.space.sharing.linkLabel')}
        hint={t('settings.space.sharing.linkHint')}
      >
        <div className="flex items-center gap-2">
          <PlaceholderInput
            value={t('settings.space.sharing.linkPlaceholder')}
            width={320}
          />
          <span className="font-sans text-[11px] text-ink-3">
            {t('settings.space.sharing.copy')}
          </span>
        </div>
      </SettingRow>
    </section>
  );
}

export function SpaceMembersPlaceholder() {
  const { t } = useTranslation('screens');
  const members: [string, string, string][] = [
    ['You', 'you@example.com', t('settings.space.members.roles.owner')],
    ['Mira K.', 'mira@example.com', t('settings.space.members.roles.editor')],
    ['Sam J.', 'sam@example.com', t('settings.space.members.roles.viewer')],
  ];
  return (
    <section>
      <TabHeader
        titleKey="settings.space.members.title"
        subtitleKey="settings.space.members.subtitle"
        breadcrumbKey="settings.space.breadcrumb"
      />
      <SettingRow
        label={t('settings.space.members.inviteLabel')}
        hint={t('settings.space.members.inviteHint')}
      >
        <div className="flex items-center gap-2">
          <PlaceholderInput
            value={t('settings.space.members.invitePlaceholder')}
            width={260}
          />
          <span className="inline-block border border-ink px-3 py-1.5 text-[12px] font-medium text-ink">
            {t('settings.space.members.inviteButton')}
          </span>
        </div>
      </SettingRow>
      <div className="border-b border-rule/60 py-[18px]">
        <div className="mb-2 text-[13px] font-medium text-ink">
          {t('settings.space.members.membersLabel')}
        </div>
        <div className="flex flex-col gap-1">
          {members.map(([name, email, role], i) => (
            <div
              key={i}
              className="flex items-center gap-3 border-b border-rule/40 py-2"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-paper-2 font-mono text-[11px] uppercase text-ink-2">
                {name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-serif text-[13px] text-ink">{name}</div>
                <div className="font-mono text-[10px] text-ink-3">{email}</div>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
                {role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SpaceExportPlaceholder() {
  const { t } = useTranslation('screens');
  return (
    <section>
      <TabHeader
        titleKey="settings.space.export.title"
        subtitleKey="settings.space.export.subtitle"
        breadcrumbKey="settings.space.breadcrumb"
      />
      <SettingRow
        label={t('settings.space.export.formatLabel')}
        hint={t('settings.space.export.formatHint')}
      >
        <PlaceholderChips
          options={[
            t('settings.space.export.formats.markdown'),
            t('settings.space.export.formats.html'),
            t('settings.space.export.formats.pdf'),
            t('settings.space.export.formats.latex'),
          ]}
          active={0}
        />
      </SettingRow>
      <SettingRow label={t('settings.space.export.lastLabel')}>
        <span className="font-serif text-[14px] italic text-ink-3">
          {t('settings.space.export.lastValue')}
        </span>
      </SettingRow>
    </section>
  );
}
