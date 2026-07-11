import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TOUR_IDS, TOURS, type TourId } from '@/tours/tours';
import { useTour } from '@/tours/useTour';
import { getCompleted } from '@/tours/storage';
import { SectionLabel } from './QuickSettingsSectionLabel';
import { MenuItem } from './QuickSettingsMenuItem';

export const HelpToursSection = () => {
  const { t } = useTranslation(['chrome', 'tours']);
  const { replay } = useTour();
  const [completedSnapshot, setCompletedSnapshot] = useState<string[]>(() =>
    getCompleted(),
  );

  useEffect(() => {
    setCompletedSnapshot(getCompleted());
  }, []);

  const handleTour = (id: TourId) => {
    replay(id);
    setCompletedSnapshot(getCompleted());
  };

  return (
    <>
      <SectionLabel testId="quick-settings-section-help-tours">
        {t('chrome:quickSettings.helpToursLabel')}
      </SectionLabel>

      {TOUR_IDS.map((id) => {
        const done = completedSnapshot.includes(id);
        return (
          <MenuItem
            key={id}
            onClick={() => { handleTour(id); }}
            done={done}
            kbd={id === 'welcome' ? t('chrome:quickSettings.helpKbd') : undefined}
            testId={`quick-settings-tour-${id}`}
          >
            {t(`tours:${TOURS[id].titleKey}`)}
          </MenuItem>
        );
      })}
    </>
  );
};
