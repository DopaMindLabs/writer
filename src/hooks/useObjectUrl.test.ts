import { renderHook } from '@testing-library/react';
import { useObjectUrl } from './useObjectUrl';

describe('useObjectUrl', () => {
  it('returns null when no blob is given', () => {
    const { result } = renderHook(() => useObjectUrl(null));
    expect(result.current).toBeNull();
  });

  it('creates an object URL for a blob and revokes it on unmount', () => {
    const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
    const blob = new Blob(['x'], { type: 'image/png' });

    const { result, unmount } = renderHook(() => useObjectUrl(blob));
    expect(result.current).toBe('blob:x');
    expect(createSpy).toHaveBeenCalledWith(blob);

    unmount();
    expect(revokeSpy).toHaveBeenCalledWith('blob:x');
  });

  it('clears the URL when the blob becomes null', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:y');
    const blob = new Blob(['y'], { type: 'image/png' });

    const { result, rerender } = renderHook(
      ({ b }: { b: Blob | null }) => useObjectUrl(b),
      { initialProps: { b: blob as Blob | null } },
    );
    expect(result.current).toBe('blob:y');

    rerender({ b: null });
    expect(result.current).toBeNull();
  });
});
