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

const typeInto = (editor: LexicalEditor, text: string) => {
  act(() => {
    editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        const p = $createParagraphNode();
        p.append($createTextNode(text));
        root.append(p);
      },
      { discrete: true },
    );
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
});
