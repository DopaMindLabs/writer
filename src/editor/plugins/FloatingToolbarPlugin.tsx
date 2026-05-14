import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  INDENT_CONTENT_COMMAND,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import { $isListItemNode, $isListNode } from '@lexical/list';
import { mergeRegister } from '@lexical/utils';
import {
  applyHeading,
  readActiveFormats,
  toggleInlineFormat,
  toggleList,
  toggleQuote,
  type ActiveFormats,
} from '../formatting';
import { FloatingToolbar } from './FloatingToolbar';

const TOOLBAR_HEIGHT = 36;
const VIEWPORT_PADDING = 8;
const MAX_LIST_DEPTH = 2;

interface Anchor {
  top: number;
  left: number;
}

const isCoarsePointer =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(pointer: coarse)').matches;

export function FloatingToolbarPlugin() {
  if (isCoarsePointer) return null;
  return <FloatingToolbarPluginImpl />;
}

function FloatingToolbarPluginImpl() {
  const [editor] = useLexicalComposerContext();
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [formats, setFormats] = useState<ActiveFormats>({
    block: 'paragraph',
    bold: false,
    italic: false,
  });
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  const positionFromRect = useCallback((rect: DOMRect): Anchor => {
    const toolbarWidth = toolbarRef.current?.offsetWidth ?? 320;
    let top = rect.top - TOOLBAR_HEIGHT - 8;
    if (top < VIEWPORT_PADDING) {
      top = rect.bottom + 8;
    }
    let left = rect.left + rect.width / 2 - toolbarWidth / 2;
    const maxLeft = window.innerWidth - toolbarWidth - VIEWPORT_PADDING;
    if (left < VIEWPORT_PADDING) left = VIEWPORT_PADDING;
    if (left > maxLeft) left = maxLeft;
    return { top, left };
  }, []);

  const positionFromPoint = useCallback((x: number, y: number): Anchor => {
    const toolbarWidth = toolbarRef.current?.offsetWidth ?? 320;
    let top = y + 8;
    if (top + TOOLBAR_HEIGHT + VIEWPORT_PADDING > window.innerHeight) {
      top = y - TOOLBAR_HEIGHT - 8;
    }
    let left = x - toolbarWidth / 2;
    const maxLeft = window.innerWidth - toolbarWidth - VIEWPORT_PADDING;
    if (left < VIEWPORT_PADDING) left = VIEWPORT_PADDING;
    if (left > maxLeft) left = maxLeft;
    return { top, left };
  }, []);

  const showFromSelection = useCallback(() => {
    const domSelection = window.getSelection();
    if (!domSelection || domSelection.rangeCount === 0) {
      setAnchor(null);
      return;
    }
    const range = domSelection.getRangeAt(0);
    if (range.collapsed) {
      setAnchor(null);
      return;
    }
    const rootElement = editor.getRootElement();
    if (
      !rootElement ||
      !rootElement.contains(range.startContainer) ||
      !rootElement.contains(range.endContainer)
    ) {
      setAnchor(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setAnchor(null);
      return;
    }
    setFormats(readActiveFormats(editor));
    setAnchor(positionFromRect(rect));
  }, [editor, positionFromRect]);

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          showFromSelection();
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        INDENT_CONTENT_COMMAND,
        () => {
          let block = false;
          editor.getEditorState().read(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) return;
            const nodes = selection.getNodes();
            for (const node of nodes) {
              let listItem = node;
              while (listItem && !$isListItemNode(listItem)) {
                const parent = listItem.getParent();
                if (!parent) break;
                listItem = parent;
              }
              if (!$isListItemNode(listItem)) continue;
              let depth = 0;
              let current = listItem.getParent();
              while (current) {
                if ($isListNode(current)) depth += 1;
                current = current.getParent();
              }
              if (depth >= MAX_LIST_DEPTH) {
                block = true;
                break;
              }
            }
          });
          return block;
        },
        COMMAND_PRIORITY_HIGH,
      ),
    );
  }, [editor, showFromSelection]);

  useEffect(() => {
    const rootElement = editor.getRootElement();
    if (!rootElement) return undefined;

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      const domSelection = window.getSelection();
      const hasRangeSelection =
        domSelection &&
        domSelection.rangeCount > 0 &&
        !domSelection.getRangeAt(0).collapsed &&
        rootElement.contains(domSelection.getRangeAt(0).startContainer);

      setFormats(readActiveFormats(editor));
      if (hasRangeSelection) {
        const rect = domSelection!.getRangeAt(0).getBoundingClientRect();
        setAnchor(positionFromRect(rect));
      } else {
        setAnchor(positionFromPoint(event.clientX, event.clientY));
      }
    };

    rootElement.addEventListener('contextmenu', onContextMenu);
    return () => {
      rootElement.removeEventListener('contextmenu', onContextMenu);
    };
  }, [editor, positionFromRect, positionFromPoint]);

  useEffect(() => {
    if (!anchor) return undefined;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (toolbarRef.current && target && toolbarRef.current.contains(target)) {
        return;
      }
      if (event.button === 2) return;
      setAnchor(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAnchor(null);
    };
    const onScroll = () => setAnchor(null);

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [anchor]);

  if (!anchor) return null;

  return createPortal(
    <FloatingToolbar
      ref={toolbarRef}
      block={formats.block}
      bold={formats.bold}
      italic={formats.italic}
      onHeading={(level) => {
        applyHeading(editor, level);
        setFormats(readActiveFormats(editor));
      }}
      onList={(kind) => {
        toggleList(editor, kind);
        setFormats(readActiveFormats(editor));
      }}
      onQuote={() => {
        toggleQuote(editor);
        setFormats(readActiveFormats(editor));
      }}
      onBold={() => {
        toggleInlineFormat(editor, 'bold');
        setFormats(readActiveFormats(editor));
      }}
      onItalic={() => {
        toggleInlineFormat(editor, 'italic');
        setFormats(readActiveFormats(editor));
      }}
      style={{
        position: 'fixed',
        top: anchor.top,
        left: anchor.left,
      }}
    />,
    document.body,
  );
}
