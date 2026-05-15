import { renderHook, act } from '@testing-library/react';
import { useTour } from './useTour';
import * as driverSetup from './driver-setup';
import { markCompleted, resetAll } from './storage';

describe('useTour', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetAll();
    vi.restoreAllMocks();
  });

  it('start invokes runTour for the requested tour id', () => {
    const runTourSpy = vi
      .spyOn(driverSetup, 'runTour')
      .mockImplementation(() => ({}) as ReturnType<typeof driverSetup.runTour>);
    const { result } = renderHook(() => useTour());
    act(() => result.current.start('welcome'));
    expect(runTourSpy).toHaveBeenCalledTimes(1);
  });

  it('replay resets the completion flag then invokes runTour', () => {
    markCompleted('welcome');
    expect(result_isCompleted('welcome')).toBe(true);
    const runTourSpy = vi
      .spyOn(driverSetup, 'runTour')
      .mockImplementation(() => ({}) as ReturnType<typeof driverSetup.runTour>);
    const { result } = renderHook(() => useTour());
    act(() => result.current.replay('welcome'));
    expect(runTourSpy).toHaveBeenCalledTimes(1);
    // Completion flag is cleared by resetTour
    expect(result_isCompleted('welcome')).toBe(false);
  });

  it('exposes isCompleted, resetTour and resetAll from the storage module', () => {
    const { result } = renderHook(() => useTour());
    expect(typeof result.current.isCompleted).toBe('function');
    expect(typeof result.current.resetTour).toBe('function');
    expect(typeof result.current.resetAll).toBe('function');
  });
});

// Helper to read completion without importing isCompleted twice
function result_isCompleted(id: string): boolean {
  const raw = window.localStorage.getItem('lipsum-tours');
  if (!raw) return false;
  const parsed = JSON.parse(raw) as { completed?: string[] };
  return Array.isArray(parsed.completed) && parsed.completed.includes(id);
}
