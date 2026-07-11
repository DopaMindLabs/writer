import { act, renderHook } from '@/test/test-utils';
import { useUI } from '@/store/ui';
import { useTabItems } from './useTabItems';

const byKey = (items: ReturnType<typeof useTabItems>) =>
  Object.fromEntries(items.map((item) => [item.key, item]));

describe('useTabItems', () => {
  it('computes the write/read/brain hrefs from the active space and doc', () => {
    const { result } = renderHook(() =>
      useTabItems({ spaceId: 's1', docId: 'd1' }),
    );
    const tabs = byKey(result.current);
    expect(tabs.write.href).toBe('/s/s1/d/d1');
    expect(tabs.read.href).toBe('/s/s1/d/d1/read');
    expect(tabs.brain.href).toBe('/s/s1/brain-space');
    expect(tabs.cite.href).toBeUndefined();
    expect(tabs.more.href).toBeUndefined();
  });

  it('falls back through space-level then home as the ids drop away', () => {
    const { result: spaceOnly } = renderHook(() =>
      useTabItems({ spaceId: 's1', docId: null }),
    );
    const a = byKey(spaceOnly.current);
    expect(a.write.href).toBe('/s/s1');
    expect(a.read.href).toBeUndefined();

    const { result: none } = renderHook(() =>
      useTabItems({ spaceId: null, docId: null }),
    );
    const b = byKey(none.current);
    expect(b.write.href).toBe('/');
    expect(b.brain.href).toBeUndefined();
  });

  it('wires the cite and more actions to the UI store', () => {
    const { result } = renderHook(() =>
      useTabItems({ spaceId: 's1', docId: 'd1' }),
    );
    const tabs = byKey(result.current);
    act(() => { tabs.cite.onClick?.(); });
    expect(useUI.getState().citationsDrawerOpen).toBe(true);
    act(() => { tabs.more.onClick?.(); });
    expect(useUI.getState().mobileMoreOpen).toBe(true);
  });

  it('omits a split tab (mobile split is deferred to its own PR)', () => {
    const { result } = renderHook(() =>
      useTabItems({ spaceId: 's1', docId: 'd1' }),
    );
    expect(result.current.map((item) => String(item.key))).not.toContain('split');
  });
});
