import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

/**
 * Sensors shared by the sidebar's sortable lists: a pointer sensor with a small
 * activation distance (so clicks on links and menus still register) and a
 * keyboard sensor for accessible drag with the arrow keys.
 */
export const useSortableSensors = () =>
  useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
