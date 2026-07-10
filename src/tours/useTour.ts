import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { TOURS, type TourId } from './tours';
import { runTour } from './driver-setup';
import { isCompleted, resetTour, resetAll } from './storage';

export function useTour() {
  const { t } = useTranslation('tours');

  const start = useCallback(
    (id: TourId) => {
      runTour({ t, tour: TOURS[id] });
    },
    [t],
  );

  const replay = useCallback(
    (id: TourId) => {
      resetTour(id);
      runTour({ t, tour: TOURS[id] });
    },
    [t],
  );

  return {
    start,
    replay,
    isCompleted,
    resetTour,
    resetAll,
  };
}
