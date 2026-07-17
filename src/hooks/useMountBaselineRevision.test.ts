import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/lib/revisions', () => ({
  captureBaselineRevision: vi.fn(async () => {}),
  resetAutoThrottle: vi.fn(),
}));

const { captureBaselineRevision, resetAutoThrottle } = await import('@/lib/revisions');
const { useMountBaselineRevision } = await import('./useMountBaselineRevision');

describe('useMountBaselineRevision', () => {
  beforeEach(() => {
    vi.mocked(captureBaselineRevision).mockClear();
    vi.mocked(resetAutoThrottle).mockClear();
  });

  it('captures the baseline once with the body present at mount', () => {
    renderHook(() => useMountBaselineRevision('d1', 'body-1'));
    expect(captureBaselineRevision).toHaveBeenCalledTimes(1);
    expect(captureBaselineRevision).toHaveBeenCalledWith('d1', 'body-1');
  });

  it('does not re-capture when only the body changes for the same document', () => {
    const { rerender } = renderHook(
      ({ id, body }) => useMountBaselineRevision(id, body),
      { initialProps: { id: 'd1', body: 'body-1' } },
    );
    rerender({ id: 'd1', body: 'body-2' });
    expect(captureBaselineRevision).toHaveBeenCalledTimes(1);
  });

  it('re-captures with the current body and resets the old throttle on id change', () => {
    const { rerender } = renderHook(
      ({ id, body }) => useMountBaselineRevision(id, body),
      { initialProps: { id: 'd1', body: 'body-1' } },
    );
    rerender({ id: 'd2', body: 'body-2' });
    expect(resetAutoThrottle).toHaveBeenCalledWith('d1');
    expect(captureBaselineRevision).toHaveBeenLastCalledWith('d2', 'body-2');
    expect(captureBaselineRevision).toHaveBeenCalledTimes(2);
  });

  it('resets the throttle on unmount', () => {
    const { unmount } = renderHook(() => useMountBaselineRevision('d1', 'body-1'));
    unmount();
    expect(resetAutoThrottle).toHaveBeenCalledWith('d1');
  });
});
