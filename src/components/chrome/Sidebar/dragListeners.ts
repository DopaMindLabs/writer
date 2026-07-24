import type { KeyboardEvent } from 'react';
import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from '@/components/libs/dnd';

/**
 * Props for a drag surface that *is* an interactive row (it wraps links,
 * buttons, and inline inputs) rather than a dedicated handle. The keyboard
 * sensor is gated to fire only when the surface itself is focused, so a
 * keystroke bubbling up from a child — including a portaled rename dialog, since
 * React routes portal events through the component tree — never starts a drag.
 * The `button` role dnd-kit adds is dropped so the row is not announced as a
 * button around its own contents.
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
});
