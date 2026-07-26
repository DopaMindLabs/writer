import {
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  sortableKeyboardCoordinates,
  useSensor,
  useSensors,
} from '@/components/libs/dnd';

/**
 * Sensors shared by the sidebar's sortable lists. Mouse drags activate on
 * movement (the desktop convention): pressing a row and travelling 8px begins
 * the drag immediately, while a click, double-click, or menu press — however
 * long it is held — is never misclassified as a drag, because it does not move.
 * Touch keeps the long-press convention (delay), with `tolerance` cancelling
 * the drag when the finger moves first (a scroll). The keyboard sensor makes
 * the same drag operable with the arrow keys.
 */
export const useSortableSensors = () =>
  useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
