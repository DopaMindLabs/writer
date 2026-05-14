import { act } from '@testing-library/react';
import { useUI } from './ui';

describe('useUI store', () => {
  beforeEach(() => {
    window.localStorage.clear();
    act(() => {
      useUI.setState({
        currentSpaceId: null,
        currentDocId: null,
        theme: 'light',
        exportOpen: false,
      });
    });
  });

  it('setCurrentSpaceId updates state and persists theme + spaceId', () => {
    act(() => useUI.getState().setCurrentSpaceId('s1'));
    expect(useUI.getState().currentSpaceId).toBe('s1');
    expect(JSON.parse(window.localStorage.getItem('lorem-ui') ?? '{}')).toEqual(
      { theme: 'light', currentSpaceId: 's1' },
    );
  });

  it('setCurrentDocId updates state without persisting', () => {
    act(() => useUI.getState().setCurrentDocId('d1'));
    expect(useUI.getState().currentDocId).toBe('d1');
    expect(window.localStorage.getItem('lorem-ui')).toBeNull();
  });

  it('setTheme updates state and persists', () => {
    act(() => useUI.getState().setTheme('dark'));
    expect(useUI.getState().theme).toBe('dark');
    expect(
      JSON.parse(window.localStorage.getItem('lorem-ui') ?? '{}').theme,
    ).toBe('dark');
  });

  it('setExportOpen toggles modal flag', () => {
    act(() => useUI.getState().setExportOpen(true));
    expect(useUI.getState().exportOpen).toBe(true);
    act(() => useUI.getState().setExportOpen(false));
    expect(useUI.getState().exportOpen).toBe(false);
  });

  it('survives a corrupted localStorage payload', () => {
    window.localStorage.setItem('lorem-ui', '{not json');
    act(() => useUI.getState().setTheme('dark'));
    expect(useUI.getState().theme).toBe('dark');
  });
});
