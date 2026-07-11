import { useTranslation } from 'react-i18next';
import { useUI, type Theme } from '@/store/ui';
import { Chip } from '@/components/ui/Chip';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { QuickSettingRow, type QuickSettingSize } from './QuickSettingRow';

const THEMES: { id: Theme; labelKey: string; titleKey: string }[] = [
  { id: 'light', labelKey: 'quickSettings.themes.light', titleKey: 'topbar.themes.light' },
  { id: 'dark', labelKey: 'quickSettings.themes.dark', titleKey: 'topbar.themes.dark' },
  { id: 'hc-light', labelKey: 'quickSettings.themes.hcLight', titleKey: 'topbar.themes.hcLight' },
  { id: 'hc-dark', labelKey: 'quickSettings.themes.hcDark', titleKey: 'topbar.themes.hcDark' },
];

export const ThemeRow = ({ size = 'compact' }: { size?: QuickSettingSize }) => {
  const { t } = useTranslation('chrome');
  const theme = useUI((s) => s.theme);
  const setTheme = useUI((s) => s.setTheme);
  const chipClass = size === 'roomy' ? undefined : 'px-2 py-0.5 text-[10px]';
  return (
    <QuickSettingRow label={t('quickSettings.themeLabel')} size={size}>
      <div className="flex flex-wrap gap-1">
        {THEMES.map((opt) => (
          <Tooltip key={opt.id}>
            <TooltipTrigger asChild>
              <Chip
                active={theme === opt.id}
                onClick={() => { setTheme(opt.id); }}
                className={chipClass}
                aria-label={t(opt.titleKey)}
                data-testid={`quick-settings-theme-${opt.id}`}
              >
                {t(opt.labelKey)}
              </Chip>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {t(opt.titleKey)}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </QuickSettingRow>
  );
};
