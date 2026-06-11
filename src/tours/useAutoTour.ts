import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TOURS, type TourId } from './tours';
import { runTour } from './driver-setup';
import { isCompleted } from './storage';

interface UseAutoTourOptions {
  disabled?: boolean;
  ready?: boolean;
}

export function useAutoTour(id: TourId, opts: UseAutoTourOptions = {}) {
  const { disabled = false, ready = true } = opts;
  const { t } = useTranslation('tours');

  useEffect(() => {
    if (disabled || !ready) return;
    if (import.meta.env.MODE === 'test') return;
    if (isCompleted(id)) return;

    const raf = requestAnimationFrame(() => {
      runTour({ t, tour: TOURS[id] });
    });
    return () => cancelAnimationFrame(raf);
  }, [id, disabled, ready, t]);
}
