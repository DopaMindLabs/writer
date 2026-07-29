/**
 * The drag-and-drop primitives (dnd-kit), re-exported so the app imports them
 * from one place — like `icons` and `primitives`. Never import `@dnd-kit/*`
 * directly in a component; go through here.
 */
export {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragCancelEvent,
  type DragEndEvent,
  type DragStartEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
  type ScreenReaderInstructions,
} from '@dnd-kit/core';
export {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
export { CSS } from '@dnd-kit/utilities';
