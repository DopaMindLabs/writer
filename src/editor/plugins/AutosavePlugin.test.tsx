import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render } from '@testing-library/react';
import { createRef, type ReactNode, type RefObject } from 'react';
import type { LexicalEditor } from 'lexical';
import { $createParagraphNode, $createTextNode, $getRoot } from 'lexical';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { AutosavePlugin } from './AutosavePlugin';
import { serializeState } from '@/editor/serialize';
import { NO_FLUSH, type FlushResult } from '@/lib/collab/flush.types';

const CaptureEditor = ({ onReady }: { onReady: (e: LexicalEditor) => void }) => {
  const [editor] = useLexicalComposerContext();
  onReady(editor);
  return null;
};

const withComposer = (ui: ReactNode) => (
  <LexicalComposer
    initialConfig={{
      namespace: 'autosave-test',
      nodes: [],
      onError: (error: Error) => {
        throw error;
      },
    }}
  >
    {ui}
  </LexicalComposer>
);

const writeText = (text: string) => {
  const root = $getRoot();
  root.clear();
  const p = $createParagraphNode();
  p.append($createTextNode(text));
  root.append(p);
};

const typeInto = (editor: LexicalEditor, text: string) => {
  act(() => {
    editor.update(() => writeText(text), { discrete: true });
  });
};

const typeIntoTagged = (editor: LexicalEditor, text: string, tag: string) => {
  act(() => {
    editor.update(() => writeText(text), { discrete: true, tag });
  });
};

describe('AutosavePlugin', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('flushes a pending save when unmounted before the debounce fires', () => {
    const onChange = vi.fn();
    let editor!: LexicalEditor;
    const { unmount } = render(
      withComposer(
        <>
          <CaptureEditor onReady={(e) => (editor = e)} />
          <AutosavePlugin onChange={onChange} debounceMs={600} />
        </>,
      ),
    );

    typeInto(editor, 'unsaved words');
    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      unmount();
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toContain('unsaved words');
  });

  it('saves once after the debounce elapses', () => {
    const onChange = vi.fn();
    let editor!: LexicalEditor;
    render(
      withComposer(
        <>
          <CaptureEditor onReady={(e) => (editor = e)} />
          <AutosavePlugin onChange={onChange} debounceMs={600} />
        </>,
      ),
    );

    typeInto(editor, 'one');
    typeInto(editor, 'two');
    typeInto(editor, 'three');
    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toContain('three');
  });

  it('does not save the same serialized state twice on unmount', () => {
    const onChange = vi.fn();
    let editor!: LexicalEditor;
    const { unmount } = render(
      withComposer(
        <>
          <CaptureEditor onReady={(e) => (editor = e)} />
          <AutosavePlugin onChange={onChange} debounceMs={600} />
        </>,
      ),
    );

    typeInto(editor, 'final words');
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(onChange).toHaveBeenCalledTimes(1);

    act(() => {
      unmount();
    });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  const renderPlugin = (onChange: (serialized: string) => Promise<void>) => {
    let editor!: LexicalEditor;
    render(
      withComposer(
        <>
          <CaptureEditor onReady={(e) => (editor = e)} />
          <AutosavePlugin onChange={onChange} debounceMs={600} />
        </>,
      ),
    );
    return editor;
  };

  it('defers a collaboration-tagged update to the backstop, not the primary debounce', () => {
    const onChange = vi.fn();
    const editor = renderPlugin(onChange);

    typeIntoTagged(editor, 'remote text', 'collaboration');
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(600); // reach the 2×debounce backstop
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toContain('remote text');
  });

  it('coalesces repeated collaboration updates into a single backstop save', () => {
    const onChange = vi.fn();
    const editor = renderPlugin(onChange);

    typeIntoTagged(editor, 'remote one', 'collaboration');
    act(() => {
      vi.advanceTimersByTime(300);
    });
    typeIntoTagged(editor, 'remote two', 'collaboration');
    act(() => {
      vi.advanceTimersByTime(900); // 1200ms after the first collaboration update
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toContain('remote two');
  });

  it('saves a historic-tagged update on the normal debounce (undo must persist)', () => {
    const onChange = vi.fn();
    const editor = renderPlugin(onChange);

    typeIntoTagged(editor, 'undone words', 'historic');
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toContain('undone words');
  });

  it('does not re-save when a collaboration backstop reproduces saved content', () => {
    const onChange = vi.fn();
    const editor = renderPlugin(onChange);

    typeInto(editor, 'stable');
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(onChange).toHaveBeenCalledTimes(1);

    typeIntoTagged(editor, 'stable', 'collaboration');
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(onChange).toHaveBeenCalledTimes(1); // dedupe: identical content
  });

  /** The canonical serialized form of a single-paragraph body — the exact string
   *  a mounted editor emits for it, so it can stand in as the persisted baseline. */
  const serializeText = (text: string): string => {
    let editor!: LexicalEditor;
    const { unmount } = render(
      withComposer(<CaptureEditor onReady={(e) => (editor = e)} />),
    );
    typeInto(editor, text);
    const out = serializeState(editor.getEditorState());
    act(() => {
      unmount();
    });
    return out;
  };

  const renderWithBaseline = (
    onChange: (serialized: string) => Promise<void>,
    persistedBody: string,
  ): { editor: LexicalEditor; flushRef: RefObject<() => Promise<FlushResult>> } => {
    const flushRef = createRef<() => Promise<FlushResult>>() as RefObject<
      () => Promise<FlushResult>
    >;
    let editor!: LexicalEditor;
    render(
      withComposer(
        <>
          <CaptureEditor onReady={(e) => (editor = e)} />
          <AutosavePlugin
            onChange={onChange}
            debounceMs={600}
            flushRef={flushRef}
            persistedBody={persistedBody}
          />
        </>,
      ),
    );
    return { editor, flushRef };
  };

  it('flushes NO_FLUSH for a clean editor seeded to the persisted baseline', async () => {
    // The collaboration bootstrap loads exactly the persisted body; a flush before
    // any local edit must report nothing to persist, so cloud reconciliation does
    // not mistake the seed for unsaved local work.
    const persisted = serializeText('seed content');
    const onChange = vi.fn(async () => {});
    const { editor, flushRef } = renderWithBaseline(onChange, persisted);

    typeIntoTagged(editor, 'seed content', 'collaboration');

    await expect(flushRef.current()).resolves.toEqual(NO_FLUSH);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('flushes the persisted body for a genuine local edit past the baseline', async () => {
    const persisted = serializeText('seed content');
    const onChange = vi.fn(async () => {});
    const { editor, flushRef } = renderWithBaseline(onChange, persisted);

    typeIntoTagged(editor, 'seed content', 'collaboration'); // bootstrap
    typeInto(editor, 'genuine local edit'); // the user types

    const result = await flushRef.current();
    expect(result.persisted).toBe(true);
    if (!result.persisted) throw new Error('unreachable');
    expect(result.body).toContain('genuine local edit');
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
