import type { Klass, LexicalNode } from 'lexical';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';
import { CodeHighlightNode, CodeNode } from '@lexical/code';

/**
 * The Lexical node list registered by every editor instance — the live
 * {@link LexicalEditor} and the headless editor used to seed CRDT state. Both
 * must register the same nodes so serialized bodies parse identically.
 */
export const EDITOR_NODES: readonly Klass<LexicalNode>[] = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  LinkNode,
  CodeNode,
  CodeHighlightNode,
];
