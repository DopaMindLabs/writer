import { vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDeferredMenuAction } from './useDeferredMenuAction';

const closeEvent = () => {
  const preventDefault = vi.fn();
  return { event: { preventDefault } as unknown as Event, preventDefault };
};

describe('useDeferredMenuAction', () => {
  it('runs the deferred action when the menu finishes closing', () => {
    const { result } = renderHook(() => useDeferredMenuAction());
    const action = vi.fn();

    act(() => {
      result.current.defer(action);
    });
    expect(action).not.toHaveBeenCalled();

    const { event, preventDefault } = closeEvent();
    act(() => {
      result.current.onCloseAutoFocus(event);
    });
    expect(action).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it('runs the action only once — a later close without a defer is a no-op', () => {
    const { result } = renderHook(() => useDeferredMenuAction());
    const action = vi.fn();

    act(() => {
      result.current.defer(action);
    });
    act(() => {
      result.current.onCloseAutoFocus(closeEvent().event);
    });
    act(() => {
      result.current.onCloseAutoFocus(closeEvent().event);
    });
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('does nothing on close when no action was deferred', () => {
    const { result } = renderHook(() => useDeferredMenuAction());
    const { event, preventDefault } = closeEvent();
    act(() => {
      result.current.onCloseAutoFocus(event);
    });
    // Focus is still kept off the trigger so an inline field can take it.
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });
});
