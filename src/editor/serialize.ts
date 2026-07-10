import type { EditorState, LexicalEditor } from 'lexical';
import { $convertToMarkdownString, TRANSFORMERS } from '@lexical/markdown';
import { $getRoot } from 'lexical';

export const serializeState = (state: EditorState): string => {
  return JSON.stringify(state.toJSON());
};

export const isSerialized = (value: string): boolean => {
  if (!value) return false;
  try {
    const parsed = JSON.parse(value) as { root?: unknown };
    return !!parsed.root;
  } catch {
    return false;
  }
};

export const toMarkdown = (editor: LexicalEditor): string => {
  let out = '';
  editor.getEditorState().read(() => {
    out = $convertToMarkdownString(TRANSFORMERS);
  });
  return out;
};

export const getPlainText = (state: EditorState): string => {
  let out = '';
  state.read(() => {
    out = $getRoot().getTextContent();
  });
  return out;
};
