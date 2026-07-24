import {
  KeyboardSensor,
  PointerSensor,
  sortableKeyboardCoordinates,
  useSensor,
  useSensors,
} from '@/components/libs/dnd';

/**
 * Sensors shared by the sidebar's sortable lists. The pointer sensor activates
 * on a short press-and-hold (delay) rather than a handle, so a quick click still
 * navigates or opens a menu while pressing and holding a row begins a drag — the
 * `tolerance` cancels the drag if the pointer moves first (a scroll or a click).
 * The keyboard sensor makes the same drag operable with the arrow keys.
 */
export const useSortableSensors = () =>
  useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
