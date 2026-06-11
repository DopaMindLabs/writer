import { driver, type DriveStep, type Driver } from 'driver.js';
import type { TFunction } from 'i18next';
import { TOURS, type TourDefinition, type TourId } from './tours';
import { markCompleted, setAutoOptOut } from './storage';
import { prefersReducedMotion } from '@/theme/a11y-prefs';

function tourMotionReduced(): boolean {
  if (typeof document === 'undefined') return false;
  const motion = document.documentElement.getAttribute('data-motion');
  if (motion === 'reduced') return true;
  if (motion === 'full') return false;
  return prefersReducedMotion();
}

interface RunTourOptions {
  t: TFunction;
  tour: TourDefinition;
  onFinish?: () => void;
  /**
   * How the tour was started. Dismissing an auto-started tour before its last
   * step opts the user out of all future auto tours; manual replays never do.
   */
  source?: 'auto' | 'manual';
}

function toDriveSteps(t: TFunction, tour: TourDefinition): DriveStep[] {
  return tour.steps.map((step) => ({
    element: step.element,
    popover: {
      title: t(step.titleKey),
      description: t(step.bodyKey),
      side: step.side,
      align: step.align,
    },
  }));
}

export function runTour({ t, tour, onFinish, source = 'manual' }: RunTourOptions): Driver {
  const steps = toDriveSteps(t, tour);
  const instance: Driver = driver({
    showProgress: true,
    allowClose: true,
    smoothScroll: !tourMotionReduced(),
    stagePadding: 6,
    stageRadius: 6,
    popoverClass: 'lipsum-tour-popover',
    nextBtnText: t('controls.next'),
    prevBtnText: t('controls.prev'),
    doneBtnText: t('controls.done'),
    progressText: t('controls.progress', {
      defaultValue: '{{current}} of {{total}}',
    }),
    onDestroyed: () => {
      markCompleted(tour.id);
      // Closing an auto tour part-way is a skip: stop auto-starting tours on
      // other screens too. Finishing the last step keeps them enabled.
      if (source === 'auto' && !instance.isLastStep()) {
        setAutoOptOut(true);
      }
      onFinish?.();
    },
    steps,
  });
  instance.drive();
  return instance;
}

export function runTourById(
  t: TFunction,
  id: TourId,
  onFinish?: () => void,
): Driver {
  return runTour({ t, tour: TOURS[id], onFinish });
}
