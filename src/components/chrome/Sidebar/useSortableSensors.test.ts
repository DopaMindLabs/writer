import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  sortableKeyboardCoordinates,
} from '@/components/libs/dnd';
import { useSortableSensors } from './useSortableSensors';

describe('useSortableSensors', () => {
  it('activates mouse drags on movement, touch drags on long-press, plus keyboard', () => {
    const { result } = renderHook(() => useSortableSensors());

    expect(result.current).toHaveLength(3);
    // Mouse: distance-based — a click or double-click (no movement) is never
    // misclassified as a drag, whatever its press duration.
    expect(result.current[0].sensor).toBe(MouseSensor);
    expect(result.current[0].options).toEqual({
      activationConstraint: { distance: 8 },
    });
    // Touch: long-press — the platform convention for touch drags.
    expect(result.current[1].sensor).toBe(TouchSensor);
    expect(result.current[1].options).toEqual({
      activationConstraint: { delay: 200, tolerance: 8 },
    });
    expect(result.current[2].sensor).toBe(KeyboardSensor);
    const keyboardOptions = result.current[2].options as {
      coordinateGetter: typeof sortableKeyboardCoordinates;
    };
    expect(keyboardOptions.coordinateGetter).toBe(sortableKeyboardCoordinates);
  });

  it('keeps the same sensor configuration across renders', () => {
    const { result, rerender } = renderHook(() => useSortableSensors());
    rerender();
    expect(result.current.map((descriptor) => descriptor.sensor)).toEqual([
      MouseSensor,
      TouchSensor,
      KeyboardSensor,
    ]);
    expect(result.current[0].options).toEqual({
      activationConstraint: { distance: 8 },
    });
  });
});
