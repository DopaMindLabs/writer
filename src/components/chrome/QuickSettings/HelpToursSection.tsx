import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TOUR_IDS, TOURS, type TourId } from '@/tours/tours';
import { useTour } from '@/tours/useTour';
import { getCompleted } from '@/tours/storage';
import { MenuItem } from '@/components/ui/MenuItem';
import { Kbd } from '@/components/ui/Kbd';
import { PopoverClose } from '@/components/ui/popover';
import { useCoarsePointer } from '@/hooks/useCoarsePointer';
import { SectionLabel } from './QuickSettingsSectionLabel';

export const HelpToursSection = () => {
  const { t } = useTranslation(['chrome', 'tours']);
  const { replay } = useTour();
  const coarsePointer = useCoarsePointer();
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
        const shortcut =
          id === 'welcome' && !coarsePointer ? (
            <span data-testid={`quick-settings-tour-${id}-kbd`}>
              <Kbd keys="mod+?" />
            </span>
          ) : undefined;
        return (
          <PopoverClose asChild key={id}>
            <MenuItem
              checkPosition="leading"
              checked={done}
              shortcut={shortcut}
              label={t(`tours:${TOURS[id].titleKey}`)}
              onClick={() => { handleTour(id); }}
              data-testid={`quick-settings-tour-${id}`}
            />
          </PopoverClose>
        );
      })}
    </>
  );
};
