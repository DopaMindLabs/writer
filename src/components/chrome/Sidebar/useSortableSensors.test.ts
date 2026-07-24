import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  KeyboardSensor,
  PointerSensor,
  sortableKeyboardCoordinates,
} from '@/components/libs/dnd';
import { useSortableSensors } from './useSortableSensors';

describe('useSortableSensors', () => {
  it('configures a press-and-hold pointer sensor and a keyboard sensor', () => {
    const { result } = renderHook(() => useSortableSensors());

    expect(result.current).toHaveLength(2);
    expect(result.current[0].sensor).toBe(PointerSensor);
    expect(result.current[0].options).toEqual({
      activationConstraint: { delay: 90, tolerance: 8 },
    });
    expect(result.current[1].sensor).toBe(KeyboardSensor);
    const keyboardOptions = result.current[1].options as {
      coordinateGetter: typeof sortableKeyboardCoordinates;
    };
    expect(keyboardOptions.coordinateGetter).toBe(sortableKeyboardCoordinates);
  });

  it('keeps the same two-sensor configuration across renders', () => {
    const { result, rerender } = renderHook(() => useSortableSensors());
    rerender();
    expect(result.current.map((descriptor) => descriptor.sensor)).toEqual([
      PointerSensor,
      KeyboardSensor,
    ]);
    expect(result.current[0].options).toEqual({
      activationConstraint: { delay: 90, tolerance: 8 },
    });
  });
});
