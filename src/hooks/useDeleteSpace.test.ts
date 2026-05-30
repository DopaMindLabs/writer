import { act, renderHook } from '@testing-library/react';
import type { Space } from '@/db/schema';

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));

vi.mock('@/lib/space/deleteSpaceCascade', () => ({
  deleteSpaceCascade: vi.fn(),
}));

import { deleteSpaceCascade } from '@/lib/space/deleteSpaceCascade';
import { useDeleteSpace } from './useDeleteSpace';

const space = { id: 's1', name: 'Novel' } as Space;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useDeleteSpace', () => {
  it('enables delete only when the typed name matches', () => {
    const { result } = renderHook(() => useDeleteSpace(space, vi.fn()));
    expect(result.current.canDelete).toBe(false);
    act(() => {
      result.current.setTyped('Novel');
    });
    expect(result.current.canDelete).toBe(true);
  });

  it('clears the typed value when the dialog closes', () => {
    const onOpenChange = vi.fn();
    const { result } = renderHook(() => useDeleteSpace(space, onOpenChange));
    act(() => {
      result.current.setTyped('Novel');
    });
    act(() => {
      result.current.handleOpenChange(false);
    });
    expect(result.current.typed).toBe('');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('deletes the space and navigates home on confirm', async () => {
    vi.mocked(deleteSpaceCascade).mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    const { result } = renderHook(() => useDeleteSpace(space, onOpenChange));
    act(() => {
      result.current.setTyped('Novel');
    });
    await act(async () => {
      await result.current.handleConfirm();
    });
    expect(deleteSpaceCascade).toHaveBeenCalledWith('s1');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(navigate).toHaveBeenCalled();
  });
});
