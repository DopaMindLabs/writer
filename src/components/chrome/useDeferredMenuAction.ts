import { useState } from 'react';

/**
 * Defer a menu item's action until its dropdown has fully closed. Running the
 * action from the item's `onSelect` lets the menu's focus teardown blur — and
 * thereby commit or cancel — an inline field the action opens (e.g. an inline
 * rename input); deferring it to the content's `onCloseAutoFocus` runs it once
 * focus has settled. The close event is always `preventDefault`ed so focus is
 * not forced back onto the trigger over the field the action focuses.
 */
export const useDeferredMenuAction = () => {
  const [pending, setPending] = useState<(() => void) | null>(null);

  const defer = (action: () => void) => {
    setPending(() => action);
  };

  const onCloseAutoFocus = (e: Event) => {
    e.preventDefault();
    if (pending) {
      setPending(null);
      pending();
    }
  };

  return { defer, onCloseAutoFocus };
};
