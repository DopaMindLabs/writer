import { driver, type DriveStep, type Driver } from 'driver.js';
import type { TFunction } from 'i18next';
import { TOURS, type TourDefinition, type TourId } from './tours';
import { markCompleted } from './storage';

interface RunTourOptions {
  t: TFunction;
  tour: TourDefinition;
  onFinish?: () => void;
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

export function runTour({ t, tour, onFinish }: RunTourOptions): Driver {
  const steps = toDriveSteps(t, tour);
  const instance: Driver = driver({
    showProgress: true,
    allowClose: true,
    smoothScroll: true,
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
