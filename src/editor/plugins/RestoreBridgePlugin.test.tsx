import { describe, it, expect } from 'vitest';
import type { ReactNode } from 'react';
import { render, act } from '@testing-library/react';
import type { LexicalEditor } from 'lexical';
import { $getRoot } from 'lexical';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { getEditorHandle } from '@/lib/collab/editorRegistry';
import { NO_FLUSH, type FlushResult } from '@/lib/collab/flush.types';
import { serializedBody } from '@/test/fixtures';
import { EDITOR_NODES } from '@/editor/nodes';
import { RestoreBridgePlugin } from './RestoreBridgePlugin';

const CaptureEditor = ({ onReady }: { onReady: (e: LexicalEditor) => void }) => {
  const [editor] = useLexicalComposerContext();
  onReady(editor);
  return null;
};

const withComposer = (ui: ReactNode) => (
  <LexicalComposer
    initialConfig={{
      namespace: 'restore-bridge-test',
      nodes: EDITOR_NODES,
      editorState: null,
      onError: (error: Error) => {
        throw error;
      },
    }}
  >
    {ui}
  </LexicalComposer>
);

const readText = (editor: LexicalEditor): string =>
  editor.getEditorState().read(() => $getRoot().getTextContent());

const noFlush = { current: async (): Promise<FlushResult> => NO_FLUSH };

describe('RestoreBridgePlugin', () => {
  it('replaces the editor body through the registered handle', () => {
    let editor!: LexicalEditor;
    render(
      withComposer(
        <>
          <CaptureEditor onReady={(e) => (editor = e)} />
          <RestoreBridgePlugin docId="bridge-1" flushRef={noFlush} />
        </>,
      ),
    );

    const handle = getEditorHandle('bridge-1');
    expect(handle).toBeDefined();

    act(() => {
      handle?.restoreBody(serializedBody('restored content'));
    });

    expect(readText(editor)).toContain('restored content');
  });

  it('exposes the autosave flush on its handle', async () => {
    const persisted: FlushResult = { persisted: true, body: 'saved body' };
    const flushRef = { current: async (): Promise<FlushResult> => persisted };
    render(withComposer(<RestoreBridgePlugin docId="bridge-3" flushRef={flushRef} />));

    expect(await getEditorHandle('bridge-3')?.flush?.()).toEqual(persisted);
    flushRef.current = async (): Promise<FlushResult> => NO_FLUSH;
    expect(await getEditorHandle('bridge-3')?.flush?.()).toEqual(NO_FLUSH);
  });

  it('unregisters its handle on unmount', () => {
    const { unmount } = render(
      withComposer(<RestoreBridgePlugin docId="bridge-2" flushRef={noFlush} />),
    );
    expect(getEditorHandle('bridge-2')).toBeDefined();

    act(() => {
      unmount();
    });
    expect(getEditorHandle('bridge-2')).toBeUndefined();
  });
});
