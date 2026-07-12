import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import { createHeadlessEditor } from '@lexical/headless';
import { $getRoot, $createParagraphNode, $createTextNode } from 'lexical';
import { EDITOR_NODES } from '@/editor/nodes';
import { EMPTY_LEXICAL_JSON } from '@/lib/docs/emptyBody';
import { seedFromLexicalJson } from './seed';

/** Build a serialized Lexical body of plain-text paragraphs via a headless editor. */
const buildBody = (paragraphs: readonly string[]): string => {
  const editor = createHeadlessEditor({
    namespace: 'lorem-editor',
    nodes: EDITOR_NODES,
    onError: (error) => {
      throw error;
    },
  });
  editor.update(
    () => {
      const root = $getRoot();
      root.clear();
      for (const paragraph of paragraphs) {
        root.append($createParagraphNode().append($createTextNode(paragraph)));
      }
    },
    { discrete: true },
  );
  return JSON.stringify(editor.getEditorState().toJSON());
};

/** The XML serialisation of the root shared type. */
const rootXml = (ydoc: Y.Doc): string =>
  (ydoc.get('root', Y.XmlText) as Y.XmlText).toString();

/** The plain text of the root shared type after applying a seed to a fresh doc. */
const decodedText = (seed: Uint8Array): string => {
  const ydoc = new Y.Doc();
  Y.applyUpdate(ydoc, seed, 'test');
  const xml = rootXml(ydoc);
  ydoc.destroy();
  return xml.replace(/<[^>]*>/g, '');
};

describe('seedFromLexicalJson', () => {
  it('seeds an empty body to a doc with a root but no text', () => {
    const seed = seedFromLexicalJson('d1', EMPTY_LEXICAL_JSON);
    expect(seed.byteLength).toBeGreaterThan(0);

    const ydoc = new Y.Doc();
    Y.applyUpdate(ydoc, seed, 'test');
    expect(ydoc.share.has('root')).toBe(true);
    expect(rootXml(ydoc).replace(/<[^>]*>/g, '').trim()).toBe('');
    ydoc.destroy();
  });

  it('seeds a multi-paragraph body so the decoded text matches', () => {
    const seed = seedFromLexicalJson(
      'd1',
      buildBody(['First paragraph.', 'Second paragraph.']),
    );
    const text = decodedText(seed);
    expect(text).toContain('First paragraph.');
    expect(text).toContain('Second paragraph.');
  });
});
