import { useTranslation } from 'react-i18next';
import { TabHeader } from '@/components/settings/TabHeader';
import { SettingRow } from '@/components/settings/SettingRow';
import { RadioRow, type RadioOption } from '@/components/ui/RadioRow';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { PillToggle } from '@/components/ui/PillToggle';
import { useUI, type Theme } from '@/store/ui';
import { useA11y } from '@/store/a11y';
import {
  MOTION_PREFS,
  TEXT_SCALES,
  LINE_SPACINGS,
} from '@/theme/a11y-prefs';

const THEME_VALUES: readonly Theme[] = ['light', 'dark', 'hc-light', 'hc-dark'];

const ThemeRow = () => {
  const { t } = useTranslation('screens');
  const theme = useUI((s) => s.theme);
  const setTheme = useUI((s) => s.setTheme);
  const options: RadioOption[] = [
    { value: 'light', label: t('settings.accessibility.theme.light') },
    { value: 'dark', label: t('settings.accessibility.theme.dark') },
    { value: 'hc-light', label: t('settings.accessibility.theme.hcLight') },
    { value: 'hc-dark', label: t('settings.accessibility.theme.hcDark') },
  ];
  const onChange = (value: string) => {
    const next = THEME_VALUES.find((v) => v === value);
    if (next) setTheme(next);
  };
  return (
    <SettingRow
      label={t('settings.accessibility.theme.label')}
      hint={t('settings.accessibility.theme.hint')}
    >
      <RadioRow
        name="a11y-theme"
        options={options}
        value={theme}
        onChange={onChange}
        aria-label={t('settings.accessibility.theme.label')}
      />
    </SettingRow>
  );
};

const MotionRow = () => {
  const { t } = useTranslation('screens');
  const motion = useA11y((s) => s.motion);
  const setMotion = useA11y((s) => s.setMotion);
  const options: RadioOption[] = [
    { value: 'auto', label: t('settings.accessibility.motion.auto') },
    { value: 'reduced', label: t('settings.accessibility.motion.reduced') },
    { value: 'full', label: t('settings.accessibility.motion.full') },
  ];
  const onChange = (value: string) => {
    const next = MOTION_PREFS.find((v) => v === value);
    if (next) setMotion(next);
  };
  return (
    <SettingRow
      label={t('settings.accessibility.motion.label')}
      hint={t('settings.accessibility.motion.hint')}
    >
      <RadioRow
        name="a11y-motion"
        options={options}
        value={motion}
        onChange={onChange}
        aria-label={t('settings.accessibility.motion.label')}
      />
    </SettingRow>
  );
};

const TextSizeRow = () => {
  const { t } = useTranslation('screens');
  const textScale = useA11y((s) => s.textScale);
  const setTextScale = useA11y((s) => s.setTextScale);
  const options = [
    t('settings.accessibility.textSize.sm'),
    t('settings.accessibility.textSize.base'),
    t('settings.accessibility.textSize.lg'),
    t('settings.accessibility.textSize.xl'),
  ];
  const onChange = (index: number) => {
    setTextScale(TEXT_SCALES[index]);
  };
  return (
    <SettingRow
      label={t('settings.accessibility.textSize.label')}
      hint={t('settings.accessibility.textSize.hint')}
    >
      <ChipGroup
        options={options}
        active={Math.max(0, TEXT_SCALES.indexOf(textScale))}
        onChange={onChange}
        label={t('settings.accessibility.textSize.label')}
      />
    </SettingRow>
  );
};

const LineSpacingRow = () => {
  const { t } = useTranslation('screens');
  const lineSpacing = useA11y((s) => s.lineSpacing);
  const setLineSpacing = useA11y((s) => s.setLineSpacing);
  const options = [
    t('settings.accessibility.lineSpacing.normal'),
    t('settings.accessibility.lineSpacing.relaxed'),
    t('settings.accessibility.lineSpacing.loose'),
  ];
  const onChange = (index: number) => {
    setLineSpacing(LINE_SPACINGS[index]);
  };
  return (
    <SettingRow
      label={t('settings.accessibility.lineSpacing.label')}
      hint={t('settings.accessibility.lineSpacing.hint')}
    >
      <ChipGroup
        options={options}
        active={Math.max(0, LINE_SPACINGS.indexOf(lineSpacing))}
        onChange={onChange}
        label={t('settings.accessibility.lineSpacing.label')}
      />
    </SettingRow>
  );
};

const LinkUnderlineRow = () => {
  const { t } = useTranslation('screens');
  const linkUnderline = useA11y((s) => s.linkUnderline);
  const setLinkUnderline = useA11y((s) => s.setLinkUnderline);
  return (
    <SettingRow
      label={t('settings.accessibility.linkUnderline.label')}
      hint={t('settings.accessibility.linkUnderline.hint')}
    >
      <PillToggle
        on={linkUnderline === 'always'}
        onToggle={() => {
          setLinkUnderline(linkUnderline === 'always' ? 'auto' : 'always');
        }}
        label={t('settings.accessibility.linkUnderline.label')}
      />
    </SettingRow>
  );
};

const FocusRow = () => {
  const { t } = useTranslation('screens');
  const focusRing = useA11y((s) => s.focusRing);
  const setFocusRing = useA11y((s) => s.setFocusRing);
  return (
    <SettingRow
      label={t('settings.accessibility.focus.label')}
      hint={t('settings.accessibility.focus.hint')}
    >
      <PillToggle
        on={focusRing === 'enhanced'}
        onToggle={() => {
          setFocusRing(focusRing === 'enhanced' ? 'standard' : 'enhanced');
        }}
        label={t('settings.accessibility.focus.label')}
      />
    </SettingRow>
  );
};

export const AccessibilityTab = () => (
  <section>
    <TabHeader
      titleKey="settings.accessibility.title"
      subtitleKey="settings.accessibility.subtitle"
    />
    <ThemeRow />
    <MotionRow />
    <TextSizeRow />
    <LineSpacingRow />
    <LinkUnderlineRow />
    <FocusRow />
  </section>
);
