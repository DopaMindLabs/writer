/**
 * The drag-and-drop primitives (dnd-kit), re-exported so the app imports them
 * from one place — like `icons` and `primitives`. Never import `@dnd-kit/*`
 * directly in a component; go through here.
 */
export {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from '@dnd-kit/core';
export {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
export { CSS } from '@dnd-kit/utilities';
