import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
  type LexicalEditor,
} from 'lexical';
import {
  $createHeadingNode,
  $createQuoteNode,
  HeadingNode,
  QuoteNode,
} from '@lexical/rich-text';
import {
  $createListItemNode,
  $createListNode,
  ListItemNode,
  ListNode,
} from '@lexical/list';
import { getActiveBlockType } from './formatting';

const makeEditor = (): LexicalEditor => {
  const editor = createEditor({
    namespace: 'test',
    onError: (e) => {
      throw e;
    },
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode],
  });
  return editor;
};

const readBlockTypeAt = (
  editor: LexicalEditor,
  selectKey: () => void,
): ReturnType<typeof getActiveBlockType> => {
  let result: ReturnType<typeof getActiveBlockType> = 'paragraph';
  editor.update(
    () => {
      selectKey();
    },
    { discrete: true },
  );
  editor.getEditorState().read(() => {
    result = getActiveBlockType();
  });
  return result;
};

describe('getActiveBlockType', () => {
  it('returns "paragraph" for a plain paragraph', () => {
    const editor = makeEditor();
    editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        const p = $createParagraphNode();
        p.append($createTextNode('hello'));
        root.append(p);
        p.selectStart();
      },
      { discrete: true },
    );
    let block: ReturnType<typeof getActiveBlockType> = 'paragraph';
    editor.getEditorState().read(() => {
      block = getActiveBlockType();
    });
    expect(block).toBe('paragraph');
  });

  it('returns "h1"–"h4" for heading nodes', () => {
    const editor = makeEditor();
    for (const tag of ['h1', 'h2', 'h3', 'h4'] as const) {
      const block = readBlockTypeAt(editor, () => {
        const root = $getRoot();
        root.clear();
        const h = $createHeadingNode(tag);
        h.append($createTextNode('heading'));
        root.append(h);
        h.selectStart();
      });
      expect(block).toBe(tag);
    }
  });

  it('returns "quote" inside a blockquote', () => {
    const editor = makeEditor();
    const block = readBlockTypeAt(editor, () => {
      const root = $getRoot();
      root.clear();
      const q = $createQuoteNode();
      q.append($createTextNode('quoted'));
      root.append(q);
      q.selectStart();
    });
    expect(block).toBe('quote');
  });

  it('returns "bullet" inside an unordered list item', () => {
    const editor = makeEditor();
    const block = readBlockTypeAt(editor, () => {
      const root = $getRoot();
      root.clear();
      const list = $createListNode('bullet');
      const item = $createListItemNode();
      item.append($createTextNode('item'));
      list.append(item);
      root.append(list);
      item.selectStart();
    });
    expect(block).toBe('bullet');
  });

  it('returns "number" inside an ordered list item', () => {
    const editor = makeEditor();
    const block = readBlockTypeAt(editor, () => {
      const root = $getRoot();
      root.clear();
      const list = $createListNode('number');
      const item = $createListItemNode();
      item.append($createTextNode('first'));
      list.append(item);
      root.append(list);
      item.selectStart();
    });
    expect(block).toBe('number');
  });

  it('returns "bullet" even at the second nested level', () => {
    const editor = makeEditor();
    const block = readBlockTypeAt(editor, () => {
      const root = $getRoot();
      root.clear();
      const outer = $createListNode('bullet');
      const outerItem = $createListItemNode();
      const inner = $createListNode('bullet');
      const innerItem = $createListItemNode();
      innerItem.append($createTextNode('nested'));
      inner.append(innerItem);
      outerItem.append(inner);
      outer.append(outerItem);
      root.append(outer);
      innerItem.selectStart();
    });
    expect(block).toBe('bullet');
  });
});
