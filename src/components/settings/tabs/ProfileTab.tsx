import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingRow } from '@/components/settings/SettingRow';
import { TabHeader } from '@/components/settings/TabHeader';
import { TextField } from '@/components/ui/TextField';
import { useProfile } from '@/lib/profile/useProfile';
import { updateProfile } from '@/lib/profile/profile';
import { PresenceHuePicker } from './PresenceHuePicker';

export const ProfileTab = () => {
  const { t } = useTranslation('screens');
  const profile = useProfile();
  const [name, setName] = useState('');
  const seededFor = useRef<string | null>(null);

  // Seed the local field from the stored profile once it first loads, keyed by
  // authorId so a genuinely different profile re-seeds but keystrokes don't.
  useEffect(() => {
    if (profile && seededFor.current !== profile.authorId) {
      setName(profile.displayName);
      seededFor.current = profile.authorId;
    }
  }, [profile]);

  return (
    <section>
      <TabHeader
        titleKey="settings.profile.title"
        subtitleKey="settings.profile.subtitle"
      />

      <SettingRow
        data-testid="setting-display-name"
        label={t('settings.profile.nameLabel')}
        hint={t('settings.profile.nameHint')}
      >
        <TextField
          aria-label={t('settings.profile.nameLabel')}
          placeholder={t('settings.profile.namePlaceholder')}
          value={name}
          disabled={!profile}
          onChange={(e) => {
            setName(e.target.value);
            void updateProfile({ displayName: e.target.value });
          }}
          className="w-48"
        />
      </SettingRow>

      <SettingRow
        data-testid="setting-presence-hue"
        label={t('settings.profile.hueLabel')}
        hint={t('settings.profile.hueHint')}
      >
        <PresenceHuePicker
          label={t('settings.profile.hueLabel')}
          value={profile?.presenceHue ?? 'presence-1'}
          onChange={(hue) => {
            void updateProfile({ presenceHue: hue });
          }}
        />
      </SettingRow>

      <div
        role="note"
        data-testid="profile-privacy-notice"
        className="mt-4 border border-rule bg-paper-2 p-3 text-[13px] text-ink-2"
      >
        {t('settings.profile.privacyNotice')}
      </div>
    </section>
  );
};
