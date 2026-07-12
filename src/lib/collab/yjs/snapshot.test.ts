import { describe, expect, it } from 'vitest';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
} from 'lexical';
import { EDITOR_NODES } from '@/editor/nodes';
import { EMPTY_LEXICAL_JSON } from '@/lib/docs/emptyBody';
import { seedFromLexicalJson } from './seed';
import { serializeDocSnapshot } from './snapshot';

const DOC_ID = 'doc-1';

/** Build a serialized Lexical body of plain-text paragraphs via a headless editor. */
const bodyOf = (...paragraphs: string[]): string => {
  const editor = createEditor({ namespace: 'lorem-editor', nodes: EDITOR_NODES });
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

describe('serializeDocSnapshot', () => {
  it('returns an empty-root body when the update log is empty', () => {
    const snapshot = serializeDocSnapshot(DOC_ID, []);
    expect(() => JSON.parse(snapshot) as unknown).not.toThrow();
    // No seed applied, so the snapshot cannot equal a real seeded body.
    expect(snapshot).not.toBe(bodyOf('hello'));
  });

  it('canonicalises the empty body idempotently (seed → snapshot is stable)', () => {
    // The stored EMPTY_LEXICAL_JSON constant predates newer paragraph fields, so
    // the first round-trip normalises it; the second must be a fixed point —
    // this stability is what keeps reconciliation of never-opened docs idempotent.
    const once = serializeDocSnapshot(DOC_ID, [
      seedFromLexicalJson(DOC_ID, EMPTY_LEXICAL_JSON),
    ]);
    const twice = serializeDocSnapshot(DOC_ID, [seedFromLexicalJson(DOC_ID, once)]);
    expect(twice).toBe(once);
    expect(JSON.parse(once)).toMatchObject({ root: { type: 'root' } });
  });

  it('round-trips a multi-paragraph body through seed → snapshot unchanged', () => {
    const body = bodyOf('first paragraph', 'second paragraph');
    const seed = seedFromLexicalJson(DOC_ID, body);
    expect(serializeDocSnapshot(DOC_ID, [seed])).toBe(body);
  });
});
