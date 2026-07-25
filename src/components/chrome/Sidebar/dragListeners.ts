import type { DragEvent, KeyboardEvent, SyntheticEvent } from 'react';
import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from '@/components/libs/dnd';

/**
 * Interactive descendants that must never begin a row drag: the kebab trigger
 * (button), menu content (portal events bubble back through the React tree),
 * and the inline-rename field, where a press-and-move selects text. A control
 * that *is* the row body — the section label button, whose only press action is
 * a double-click — opts back in with `data-drag-through`.
 */
const INTERACTIVE_SELECTOR =
  'button, input, textarea, select, [role="menu"], [role="menuitem"]';

const isInteractiveChild = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false;
  const interactive = target.closest(INTERACTIVE_SELECTOR);
  return interactive !== null && !interactive.hasAttribute('data-drag-through');
};

type PressHandler = (event: SyntheticEvent) => void;

/** Wrap a drag-activation press handler so interactive children never start a drag. */
const gatePress = (handler: unknown): PressHandler | undefined => {
  const press = handler as PressHandler | undefined;
  if (!press) return undefined;
  return (event) => {
    if (!isInteractiveChild(event.target)) press(event);
  };
};

/**
 * Props for a drag surface that *is* an interactive row (it wraps links,
 * buttons, and inline inputs) rather than a dedicated handle. Press activators
 * (mouse/touch/pointer) are gated so a press on an interactive child — or on
 * portaled menu content, since React routes portal events through the component
 * tree — never starts a drag. The keyboard sensor is gated to fire only when
 * the surface itself is focused, so a keystroke bubbling up from a child never
 * starts a drag either. The `button` role dnd-kit adds is dropped so the row is
 * not announced as a button around its own contents.
 */
export const surfaceDragProps = (
  attributes: DraggableAttributes,
  listeners: DraggableSyntheticListeners,
) => ({
  ...attributes,
  ...listeners,
  role: undefined,
  onKeyDown: (e: KeyboardEvent) => {
    const keyDown = listeners?.onKeyDown as
      | ((event: KeyboardEvent) => void)
      | undefined;
    if (keyDown && e.target === e.currentTarget) keyDown(e);
  },
  onMouseDown: gatePress(listeners?.onMouseDown),
  onTouchStart: gatePress(listeners?.onTouchStart),
  onPointerDown: gatePress(listeners?.onPointerDown),
  // Doc rows are links, which the browser drags natively: a native drag steals
  // the mouse-event stream mid-drag and the sensor "loses grip" of the row.
  onDragStart: (e: DragEvent) => {
    e.preventDefault();
  },
});
