import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, it, expect } from 'vitest';
import { db } from '@/db/db';
import { useUI } from '@/store/ui';
import { usePdfAnnotator } from './usePdfAnnotator';
import type { PdfSelectionCapture } from '@/pdf-annotator/core/types';

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

describe('usePdfAnnotator', () => {
  it('a capture only stashes; nothing is persisted yet', async () => {
    const { result } = renderHook(() => usePdfAnnotator({ mediaId: 'm1', spaceId: 's1' }));
    act(() => {
      result.current.handleCapture(capture());
    });
    expect(result.current.capture).not.toBeNull();
    expect(await db.pdfAnnotations.count()).toBe(0);
  });

  it('apply persists the chosen kind and colour and clears the stash', async () => {
    const { result } = renderHook(() => usePdfAnnotator({ mediaId: 'm1', spaceId: 's1' }));
    act(() => {
      result.current.handleCapture(capture());
    });
    await act(async () => {
      await result.current.apply({ kind: 'underline', color: 'pink' });
    });
    await waitFor(() => expect(result.current.annotations).toHaveLength(1));
    const [saved] = result.current.annotations;
    expect(saved.kind).toBe('underline');
    expect(saved.color).toBe('pink');
    expect(result.current.capture).toBeNull();
  });

  it('apply persists a note when given', async () => {
    const { result } = renderHook(() => usePdfAnnotator({ mediaId: 'm1', spaceId: 's1' }));
    act(() => {
      result.current.handleCapture(capture());
    });
    await act(async () => {
      await result.current.apply({ kind: 'highlight', color: 'yellow', note: 'remember' });
    });
    await waitFor(() => expect(result.current.annotations).toHaveLength(1));
    expect(result.current.annotations[0].note).toBe('remember');
  });

  it('apply with no stash is a no-op', async () => {
    const { result } = renderHook(() => usePdfAnnotator({ mediaId: 'm1', spaceId: 's1' }));
    await act(async () => {
      await result.current.apply({ kind: 'highlight', color: 'blue' });
    });
    expect(await db.pdfAnnotations.count()).toBe(0);
  });

  it('remove, recolour and set-note drive the facade', async () => {
    const { result } = renderHook(() => usePdfAnnotator({ mediaId: 'm1', spaceId: 's1' }));
    act(() => {
      result.current.handleCapture(capture());
    });
    await act(async () => {
      await result.current.apply({ kind: 'highlight', color: 'yellow' });
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
    const { result } = renderHook(() => usePdfAnnotator({ mediaId: 'm1', spaceId: 's1' }));
    expect(result.current.color).toBe('yellow');
    act(() => {
      result.current.setColor('blue');
    });
    expect(result.current.color).toBe('blue');
    expect(useUI.getState().pdfHighlightColor).toBe('blue');
  });
});
