import { vi } from 'vitest';
import type { KeyboardEvent } from 'react';
import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from '@/components/libs/dnd';
import { surfaceDragProps } from './dragListeners';

const attributes = {
  role: 'button',
  tabIndex: 0,
} as unknown as DraggableAttributes;

describe('surfaceDragProps', () => {
  it('drops the button role so the row is not announced as a button', () => {
    const props = surfaceDragProps(attributes, { onKeyDown: vi.fn() } as DraggableSyntheticListeners);
    expect(props.role).toBeUndefined();
    expect(props.tabIndex).toBe(0);
  });

  it('starts a keyboard drag only from the surface itself, not a child', () => {
    const onKeyDown = vi.fn();
    const props = surfaceDragProps(
      attributes,
      { onKeyDown } as DraggableSyntheticListeners,
    );
    const surface = {};
    props.onKeyDown({
      target: surface,
      currentTarget: surface,
    } as unknown as KeyboardEvent);
    expect(onKeyDown).toHaveBeenCalledTimes(1);

    // A keystroke bubbling from a child (target !== currentTarget) is ignored.
    props.onKeyDown({
      target: {},
      currentTarget: surface,
    } as unknown as KeyboardEvent);
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when there are no listeners', () => {
    const props = surfaceDragProps(attributes, undefined);
    const surface = {};
    expect(() =>
      props.onKeyDown({
        target: surface,
        currentTarget: surface,
      } as unknown as KeyboardEvent),
    ).not.toThrow();
  });
});
