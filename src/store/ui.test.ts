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
        floatingToolbarEnabled: false,
        splitDividerPct: 50,
      });
    });
  });

  it('setCurrentSpaceId updates state and persists theme + spaceId', () => {
    act(() => { useUI.getState().setCurrentSpaceId('s1'); });
    expect(useUI.getState().currentSpaceId).toBe('s1');
    expect(JSON.parse(window.localStorage.getItem('lorem-ui') ?? '{}')).toEqual(
      {
        theme: 'light',
        currentSpaceId: 's1',
        floatingToolbarEnabled: false,
        splitDividerPct: 50,
        inspectorMode: 'none',
        inspectorSection: 'outline',
        readingWidth: 'm',
        diffMode: 'side-by-side',
      },
    );
  });

  it('setCurrentDocId updates state without persisting', () => {
    act(() => { useUI.getState().setCurrentDocId('d1'); });
    expect(useUI.getState().currentDocId).toBe('d1');
    expect(window.localStorage.getItem('lorem-ui')).toBeNull();
  });

  it('setTheme updates state and persists', () => {
    act(() => { useUI.getState().setTheme('dark'); });
    expect(useUI.getState().theme).toBe('dark');
    expect(
      JSON.parse(window.localStorage.getItem('lorem-ui') ?? '{}').theme,
    ).toBe('dark');
  });

  it('setExportOpen toggles modal flag', () => {
    act(() => { useUI.getState().setExportOpen(true); });
    expect(useUI.getState().exportOpen).toBe(true);
    act(() => { useUI.getState().setExportOpen(false); });
    expect(useUI.getState().exportOpen).toBe(false);
  });

  it('floatingToolbarEnabled defaults to false', () => {
    expect(useUI.getState().floatingToolbarEnabled).toBe(false);
  });

  it('setFloatingToolbarEnabled updates state and persists alongside theme', () => {
    act(() => { useUI.getState().setFloatingToolbarEnabled(true); });
    expect(useUI.getState().floatingToolbarEnabled).toBe(true);
    expect(JSON.parse(window.localStorage.getItem('lorem-ui') ?? '{}')).toEqual(
      {
        theme: 'light',
        currentSpaceId: null,
        floatingToolbarEnabled: true,
        splitDividerPct: 50,
        inspectorMode: 'none',
        inspectorSection: 'outline',
        readingWidth: 'm',
        diffMode: 'side-by-side',
      },
    );
    act(() => { useUI.getState().setFloatingToolbarEnabled(false); });
    expect(useUI.getState().floatingToolbarEnabled).toBe(false);
    expect(
      JSON.parse(window.localStorage.getItem('lorem-ui') ?? '{}')
        .floatingToolbarEnabled,
    ).toBe(false);
  });

  it('survives a corrupted localStorage payload', () => {
    window.localStorage.setItem('lorem-ui', '{not json');
    act(() => { useUI.getState().setTheme('dark'); });
    expect(useUI.getState().theme).toBe('dark');
  });

  it('hydrates persisted state from localStorage on first import', async () => {
    window.localStorage.setItem(
      'lorem-ui',
      JSON.stringify({
        theme: 'dark',
        currentSpaceId: 'hydrated-space',
        floatingToolbarEnabled: true,
        splitDividerPct: 60,
        inspectorMode: 'expanded',
        inspectorSection: 'history',
        readingWidth: 'l',
        diffMode: 'inline',
      }),
    );
    vi.resetModules();
    const { useUI: fresh } = await import('./ui');
    const s = fresh.getState();
    expect(s.theme).toBe('dark');
    expect(s.currentSpaceId).toBe('hydrated-space');
    expect(s.floatingToolbarEnabled).toBe(true);
    expect(s.splitDividerPct).toBe(60);
    expect(s.inspectorMode).toBe('expanded');
    expect(s.inspectorSection).toBe('history');
    expect(s.readingWidth).toBe('l');
    expect(s.diffMode).toBe('inline');
  });

  it('falls back to defaults when persisted shape is invalid', async () => {
    window.localStorage.setItem(
      'lorem-ui',
      JSON.stringify({
        inspectorMode: 'bogus',
        inspectorSection: 42,
        readingWidth: 'XL',
        splitDividerPct: Number.POSITIVE_INFINITY,
        diffMode: 'nonsense',
      }),
    );
    vi.resetModules();
    const { useUI: fresh } = await import('./ui');
    const s = fresh.getState();
    expect(s.inspectorMode).toBe('none');
    expect(s.inspectorSection).toBe('outline');
    expect(s.readingWidth).toBe('m');
    expect(s.splitDividerPct).toBe(50);
    expect(s.diffMode).toBe('side-by-side');
  });

  it('setDiffMode updates state and persists', () => {
    act(() => { useUI.getState().setDiffMode('inline'); });
    expect(useUI.getState().diffMode).toBe('inline');
    expect(
      JSON.parse(window.localStorage.getItem('lorem-ui') ?? '{}').diffMode,
    ).toBe('inline');
  });

  it('setVersionModalOpen toggles the modal flag without persisting', () => {
    act(() => { useUI.getState().setVersionModalOpen(true); });
    expect(useUI.getState().versionModalOpen).toBe(true);
    expect(window.localStorage.getItem('lorem-ui')).toBeNull();
    act(() => { useUI.getState().setVersionModalOpen(false); });
    expect(useUI.getState().versionModalOpen).toBe(false);
  });

  it('setCompareRevisionIds stores the base/compare selection', () => {
    act(() => {
      useUI.getState().setCompareRevisionIds({ base: 'rev1', compare: null });
    });
    expect(useUI.getState().compareRevisionIds).toEqual({
      base: 'rev1',
      compare: null,
    });
  });

  it('openDetail/closeDetail flips detailNoteId and focuses the note', () => {
    act(() => { useUI.getState().openDetail('n1'); });
    expect(useUI.getState().detailNoteId).toBe('n1');
    expect(useUI.getState().focusedNoteId).toBe('n1');
    act(() => { useUI.getState().closeDetail(); });
    expect(useUI.getState().detailNoteId).toBeNull();
  });

  it('focusNote sets and clears the focused note', () => {
    act(() => { useUI.getState().focusNote('n2'); });
    expect(useUI.getState().focusedNoteId).toBe('n2');
    act(() => { useUI.getState().focusNote(null); });
    expect(useUI.getState().focusedNoteId).toBeNull();
  });

  it('open/closeCitationsDrawer toggles the drawer flag', () => {
    act(() => { useUI.getState().openCitationsDrawer(); });
    expect(useUI.getState().citationsDrawerOpen).toBe(true);
    act(() => { useUI.getState().closeCitationsDrawer(); });
    expect(useUI.getState().citationsDrawerOpen).toBe(false);
  });

  it('setMobileNavOpen toggles the drawer flag', () => {
    act(() => { useUI.getState().setMobileNavOpen(true); });
    expect(useUI.getState().mobileNavOpen).toBe(true);
    act(() => { useUI.getState().setMobileNavOpen(false); });
    expect(useUI.getState().mobileNavOpen).toBe(false);
  });

  it('setSplitDividerPct clamps below MIN and above MAX', () => {
    act(() => { useUI.getState().setSplitDividerPct(5); });
    expect(useUI.getState().splitDividerPct).toBe(25);
    act(() => { useUI.getState().setSplitDividerPct(95); });
    expect(useUI.getState().splitDividerPct).toBe(75);
  });

  it('setSplitDividerPct falls back to default when value is non-finite', () => {
    act(() => { useUI.getState().setSplitDividerPct(Number.NaN); });
    expect(useUI.getState().splitDividerPct).toBe(50);
  });
});
