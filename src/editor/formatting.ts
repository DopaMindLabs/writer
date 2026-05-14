import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  type LexicalEditor,
} from 'lexical';
import { $setBlocksType } from '@lexical/selection';
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
  type HeadingTagType,
} from '@lexical/rich-text';
import {
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListNode,
  REMOVE_LIST_COMMAND,
} from '@lexical/list';
import { $getNearestNodeOfType } from '@lexical/utils';

export type BlockType =
  | 'paragraph'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'quote'
  | 'bullet'
  | 'number';

export type HeadingLevel = Extract<HeadingTagType, 'h1' | 'h2' | 'h3' | 'h4'>;

export function applyHeading(editor: LexicalEditor, level: HeadingLevel): void {
  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
    const active = getActiveBlockType();
    if (active === level) {
      $setBlocksType(selection, () => $createParagraphNode());
    } else {
      $setBlocksType(selection, () => $createHeadingNode(level));
    }
  });
}

export function toggleQuote(editor: LexicalEditor): void {
  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
    const active = getActiveBlockType();
    if (active === 'quote') {
      $setBlocksType(selection, () => $createParagraphNode());
    } else {
      $setBlocksType(selection, () => $createQuoteNode());
    }
  });
}

export function toggleList(
  editor: LexicalEditor,
  kind: 'bullet' | 'number',
): void {
  const active = readActiveBlockType(editor);
  if (active === kind) {
    editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    return;
  }
  editor.dispatchCommand(
    kind === 'bullet'
      ? INSERT_UNORDERED_LIST_COMMAND
      : INSERT_ORDERED_LIST_COMMAND,
    undefined,
  );
}

export function toggleInlineFormat(
  editor: LexicalEditor,
  format: 'bold' | 'italic',
): void {
  editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
}

export function getActiveBlockType(): BlockType {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return 'paragraph';
  const anchorNode = selection.anchor.getNode();
  const element =
    anchorNode.getKey() === 'root'
      ? anchorNode
      : anchorNode.getTopLevelElementOrThrow();

  if ($isHeadingNode(element)) {
    const tag = element.getTag();
    if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4') {
      return tag;
    }
    return 'paragraph';
  }
  if ($isQuoteNode(element)) return 'quote';

  const nearestList = $getNearestNodeOfType(anchorNode, ListNode);
  if ($isListNode(nearestList)) {
    return nearestList.getListType() === 'number' ? 'number' : 'bullet';
  }
  return 'paragraph';
}

export function readActiveBlockType(editor: LexicalEditor): BlockType {
  let result: BlockType = 'paragraph';
  editor.getEditorState().read(() => {
    result = getActiveBlockType();
  });
  return result;
}

export interface ActiveFormats {
  block: BlockType;
  bold: boolean;
  italic: boolean;
}

export function readActiveFormats(editor: LexicalEditor): ActiveFormats {
  let block: BlockType = 'paragraph';
  let bold = false;
  let italic = false;
  editor.getEditorState().read(() => {
    block = getActiveBlockType();
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      bold = selection.hasFormat('bold');
      italic = selection.hasFormat('italic');
    }
  });
  return { block, bold, italic };
}
