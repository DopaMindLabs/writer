import { vi } from 'vitest';
import type { DragEvent, KeyboardEvent, SyntheticEvent } from 'react';
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

  describe('press gating for interactive children', () => {
    const pressOn = (target: Element) =>
      ({ target } as unknown as SyntheticEvent);

    it('does not start a mouse drag from a button (kebab trigger)', () => {
      const onMouseDown = vi.fn();
      const props = surfaceDragProps(attributes, {
        onMouseDown,
      } as DraggableSyntheticListeners);
      const row = document.createElement('div');
      const button = document.createElement('button');
      row.appendChild(button);
      props.onMouseDown?.(pressOn(button));
      expect(onMouseDown).not.toHaveBeenCalled();
    });

    it('does not start a mouse drag from a menu item (portal events bubble through the React tree)', () => {
      const onMouseDown = vi.fn();
      const props = surfaceDragProps(attributes, {
        onMouseDown,
      } as DraggableSyntheticListeners);
      const item = document.createElement('div');
      item.setAttribute('role', 'menuitem');
      const label = document.createElement('span');
      item.appendChild(label);
      props.onMouseDown?.(pressOn(label));
      expect(onMouseDown).not.toHaveBeenCalled();
    });

    it('does not start a mouse drag from an input (inline rename text selection)', () => {
      const onMouseDown = vi.fn();
      const props = surfaceDragProps(attributes, {
        onMouseDown,
      } as DraggableSyntheticListeners);
      const input = document.createElement('input');
      props.onMouseDown?.(pressOn(input));
      expect(onMouseDown).not.toHaveBeenCalled();
    });

    it('starts a mouse drag from the row body itself', () => {
      const onMouseDown = vi.fn();
      const props = surfaceDragProps(attributes, {
        onMouseDown,
      } as DraggableSyntheticListeners);
      const link = document.createElement('a');
      const name = document.createElement('span');
      link.appendChild(name);
      props.onMouseDown?.(pressOn(name));
      expect(onMouseDown).toHaveBeenCalledTimes(1);
    });

    it('gates touch presses the same way', () => {
      const onTouchStart = vi.fn();
      const props = surfaceDragProps(attributes, {
        onTouchStart,
      } as DraggableSyntheticListeners);
      const button = document.createElement('button');
      props.onTouchStart?.(pressOn(button));
      expect(onTouchStart).not.toHaveBeenCalled();
      const span = document.createElement('span');
      props.onTouchStart?.(pressOn(span));
      expect(onTouchStart).toHaveBeenCalledTimes(1);
    });

    it('lets a control marked data-drag-through start a drag (section label button)', () => {
      const onMouseDown = vi.fn();
      const props = surfaceDragProps(attributes, {
        onMouseDown,
      } as DraggableSyntheticListeners);
      const label = document.createElement('button');
      label.setAttribute('data-drag-through', '');
      props.onMouseDown?.(pressOn(label));
      expect(onMouseDown).toHaveBeenCalledTimes(1);
    });

    it('omits press handlers when there are no listeners', () => {
      const props = surfaceDragProps(attributes, undefined);
      expect(props.onMouseDown).toBeUndefined();
      expect(props.onTouchStart).toBeUndefined();
    });
  });

  it('suppresses native HTML5 drag so anchor rows do not hijack the mouse drag', () => {
    // Doc rows are links: without this, the browser's native link drag steals
    // the mousemove stream mid-drag and the row "loses grip".
    const props = surfaceDragProps(attributes, {
      onMouseDown: vi.fn(),
    } as DraggableSyntheticListeners);
    const preventDefault = vi.fn();
    props.onDragStart({ preventDefault } as unknown as DragEvent);
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });
});
