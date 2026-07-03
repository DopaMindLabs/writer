import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { LexicalEditor } from 'lexical';
import { $createParagraphNode, $createTextNode, $getRoot } from 'lexical';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { AutosavePlugin } from './AutosavePlugin';

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

  const renderPlugin = (onChange: (serialized: string) => void) => {
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
});
