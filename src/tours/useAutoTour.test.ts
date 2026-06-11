import { renderHook } from '@testing-library/react';
import { useAutoTour } from './useAutoTour';
import { markCompleted, resetAll } from './storage';
import * as driverSetup from './driver-setup';

describe('useAutoTour', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetAll();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('does nothing when disabled is true (no RAF scheduled, no tour ran)', () => {
    const runTourSpy = vi.spyOn(driverSetup, 'runTour');
    const raf = vi.spyOn(window, 'requestAnimationFrame');
    renderHook(() => useAutoTour('welcome', { disabled: true }));
    expect(raf).not.toHaveBeenCalled();
    expect(runTourSpy).not.toHaveBeenCalled();
  });

  it('does nothing when ready is false', () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame');
    renderHook(() => useAutoTour('welcome', { ready: false }));
    expect(raf).not.toHaveBeenCalled();
  });

  it('does nothing when running under MODE === "test" even without disabled/ready blocks', () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame');
    renderHook(() => useAutoTour('welcome'));
    expect(raf).not.toHaveBeenCalled();
  });

  it('schedules an animation frame and runs the tour when env, completion, and gates allow', () => {
    vi.stubEnv('MODE', 'production');
    let scheduled: FrameRequestCallback | null = null;
    const raf = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb) => {
        scheduled = cb;
        return 42;
      });
    const runTourSpy = vi
      .spyOn(driverSetup, 'runTour')
      .mockImplementation(() => ({}) as ReturnType<typeof driverSetup.runTour>);
    renderHook(() => useAutoTour('welcome'));
    expect(raf).toHaveBeenCalledTimes(1);
    scheduled!(performance.now());
    expect(runTourSpy).toHaveBeenCalledTimes(1);
  });

  it('does not schedule when the tour has already been completed', () => {
    vi.stubEnv('MODE', 'production');
    markCompleted('welcome');
    const raf = vi.spyOn(window, 'requestAnimationFrame');
    renderHook(() => useAutoTour('welcome'));
    expect(raf).not.toHaveBeenCalled();
  });

  it('cancels the queued animation frame on unmount before it fires', () => {
    vi.stubEnv('MODE', 'production');
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(99);
    const cancel = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => {});
    const { unmount } = renderHook(() => useAutoTour('welcome'));
    unmount();
    expect(cancel).toHaveBeenCalledWith(99);
  });
});
