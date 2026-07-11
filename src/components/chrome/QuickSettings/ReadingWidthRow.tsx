import { useTranslation } from 'react-i18next';
import { useUI, type ReadingWidth } from '@/store/ui';
import { Chip } from '@/components/ui/Chip';
import { QuickSettingRow, type QuickSettingSize } from './QuickSettingRow';

export const ReadingWidthRow = ({ size = 'compact' }: { size?: QuickSettingSize }) => {
  const { t } = useTranslation('chrome');
  const readingWidth = useUI((s) => s.readingWidth);
  const setReadingWidth = useUI((s) => s.setReadingWidth);
  const chipClass =
    size === 'roomy' ? 'uppercase' : 'px-2 py-0.5 text-[10px] uppercase';
  return (
    <QuickSettingRow
      label={t('quickSettings.readingWidthLabel')}
      hint={t('quickSettings.readingWidthHint')}
      size={size}
    >
      <div className="flex gap-1">
        {(['s', 'm', 'l'] as ReadingWidth[]).map((w) => (
          <Chip
            key={w}
            active={readingWidth === w}
            onClick={() => { setReadingWidth(w); }}
            className={chipClass}
            data-testid={`quick-settings-width-${w}`}
          >
            {t(`quickSettings.readingWidth.${w}`)}
          </Chip>
        ))}
      </div>
    </QuickSettingRow>
  );
};
