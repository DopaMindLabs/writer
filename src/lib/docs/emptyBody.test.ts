import { describe, it, expect } from 'vitest';
import { createEditor } from 'lexical';
import { EMPTY_LEXICAL_JSON } from './emptyBody';
import { EDITOR_NODES } from '@/editor/nodes';
import { isSerialized, serializeState } from '@/editor/serialize';
import { isParseableBody, lexicalJsonToPlainText } from '@/lib/revisions/lexicalJsonToPlainText';
import { countWords } from '@/editor/wordCount';

describe('EMPTY_LEXICAL_JSON', () => {
  it('is the exact serialization the editor emits (a byte-for-byte fixed point)', () => {
    // Guards the constant against drifting from the editor's output on a Lexical
    // upgrade — cloud reconciliation compares bodies with ===, so a stale default
    // would make every never-opened doc look divergent.
    const editor = createEditor({ namespace: 'lorem-editor', nodes: EDITOR_NODES });
    editor.setEditorState(editor.parseEditorState(EMPTY_LEXICAL_JSON));
    editor.update(() => undefined, { discrete: true });
    expect(serializeState(editor.getEditorState())).toBe(EMPTY_LEXICAL_JSON);
  });

  it('is recognised as serialized Lexical JSON', () => {
    expect(isSerialized(EMPTY_LEXICAL_JSON)).toBe(true);
  });

  it('parses as a valid Lexical body', () => {
    expect(isParseableBody(EMPTY_LEXICAL_JSON)).toBe(true);
  });

  it('holds no text and counts zero words', () => {
    expect(lexicalJsonToPlainText(EMPTY_LEXICAL_JSON)).toBe('');
    expect(countWords(EMPTY_LEXICAL_JSON)).toBe(0);
  });
});
