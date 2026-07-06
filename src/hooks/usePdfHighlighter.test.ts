import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, it, expect } from 'vitest';
import { db } from '@/db/db';
import { useUI } from '@/store/ui';
import { usePdfHighlighter } from './usePdfHighlighter';
import type { PdfSelectionCapture } from '@/lib/pdf/pdfGeometry';

const capture = (page = 1): PdfSelectionCapture => ({
  page,
  quote: 'a highlighted sentence',
  rects: [{ x: 0.1, y: 0.1, w: 0.2, h: 0.05 }],
});

beforeEach(() => {
  window.localStorage.clear();
  act(() => {
    useUI.setState({ pdfHighlightColor: 'yellow' });
  });
});

describe('usePdfHighlighter', () => {
  it('armed capture persists a highlight and keeps arming', async () => {
    const { result } = renderHook(() => usePdfHighlighter({ mediaId: 'm1', spaceId: 's1' }));
    act(() => {
      result.current.toggleArmed();
    });
    expect(result.current.armed).toBe(true);

    act(() => {
      result.current.handleCapture(capture());
    });

    // Await the live query settling so its flush is wrapped in act.
    await waitFor(() => expect(result.current.annotations).toHaveLength(1));
    expect(result.current.armed).toBe(true); // stays armed
    expect(result.current.lastCapture).toBeNull();
    const [saved] = result.current.annotations;
    expect(saved.color).toBe('yellow');
    expect(saved.quote).toBe('a highlighted sentence');
  });

  it('unarmed capture only stashes', async () => {
    const { result } = renderHook(() => usePdfHighlighter({ mediaId: 'm1', spaceId: 's1' }));
    act(() => {
      result.current.handleCapture(capture());
    });
    expect(result.current.lastCapture).not.toBeNull();
    expect(await db.pdfAnnotations.count()).toBe(0);
  });

  it('applyToLastCapture persists once and clears the stash', async () => {
    const { result } = renderHook(() => usePdfHighlighter({ mediaId: 'm1', spaceId: 's1' }));
    act(() => {
      result.current.handleCapture(capture());
    });
    await act(async () => {
      await result.current.applyToLastCapture('pink');
    });
    await waitFor(() => expect(result.current.annotations).toHaveLength(1));
    expect(result.current.annotations[0].color).toBe('pink');
    expect(result.current.lastCapture).toBeNull();
  });

  it('applyToLastCapture with no stash is a no-op', async () => {
    const { result } = renderHook(() => usePdfHighlighter({ mediaId: 'm1', spaceId: 's1' }));
    await act(async () => {
      await result.current.applyToLastCapture('blue');
    });
    expect(await db.pdfAnnotations.count()).toBe(0);
  });

  it('remove, recolour and set-note drive the facade', async () => {
    const { result } = renderHook(() => usePdfHighlighter({ mediaId: 'm1', spaceId: 's1' }));
    act(() => {
      result.current.handleCapture(capture());
    });
    await act(async () => {
      await result.current.applyToLastCapture('yellow');
    });
    await waitFor(() => expect(result.current.annotations).toHaveLength(1));
    const saved = result.current.annotations[0];

    await act(async () => {
      await result.current.recolor(saved.id, 'green');
    });
    await waitFor(() => expect(result.current.annotations[0]?.color).toBe('green'));

    await act(async () => {
      await result.current.setNote(saved.id, 'my note');
    });
    await waitFor(() => expect(result.current.annotations[0]?.note).toBe('my note'));

    await act(async () => {
      await result.current.remove(saved.id);
    });
    await waitFor(() => expect(result.current.annotations).toHaveLength(0));
  });

  it('exposes the colour preference and updates it', () => {
    const { result } = renderHook(() => usePdfHighlighter({ mediaId: 'm1', spaceId: 's1' }));
    expect(result.current.color).toBe('yellow');
    act(() => {
      result.current.setColor('blue');
    });
    expect(result.current.color).toBe('blue');
    expect(useUI.getState().pdfHighlightColor).toBe('blue');
  });
});
