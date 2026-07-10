import { useEffect, useRef, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getNodeByKey,
  $getRoot,
  $isElementNode,
  $isTextNode,
  type LexicalEditor,
  type TextNode,
} from 'lexical';
import { createDOMRange } from '@lexical/selection';
import {
  computeLimitBoundary,
  type Limits,
  type TextSegment,
} from '@/lib/docInspector/boundary';

interface LimitHighlightPluginProps {
  wordLimit?: number;
  charLimit?: number;
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

const readOverLimitRects = (editor: LexicalEditor, limits: Limits) => {
  const segments: TextSegment[] = [];
  let lastTextNode: TextNode | null = null;
  for (const [index, block] of $getRoot().getChildren().entries()) {
    if (index > 0) segments.push({ text: '\n\n', nodeKey: null });
    if (!$isElementNode(block)) continue;
    for (const textNode of block.getAllTextNodes()) {
      segments.push({ text: textNode.getTextContent(), nodeKey: textNode.getKey() });
      lastTextNode = textNode;
    }
  }

  const boundary = computeLimitBoundary(segments, limits);
  if (!boundary || lastTextNode === null) return [];
  const anchor = $getNodeByKey(boundary.nodeKey);
  if (!$isTextNode(anchor)) return [];
  const range = createDOMRange(
    editor,
    anchor,
    boundary.offset,
    lastTextNode,
    lastTextNode.getTextContentSize(),
  );
  if (!range) return [];
  return Array.from(range.getClientRects()).filter(
    (rect) => rect.width > 0 && rect.height > 0,
  );
};

const measureBoxes = (
  editor: LexicalEditor,
  overlay: HTMLElement,
  limits: Limits,
): Box[] => {
  const rects = editor.getEditorState().read(() => readOverLimitRects(editor, limits));
  const container = overlay.getBoundingClientRect();
  return rects.map((rect) => ({
    top: rect.top - container.top,
    left: rect.left - container.left,
    width: rect.width,
    height: rect.height,
  }));
};

export const LimitHighlightPlugin = ({
  wordLimit,
  charLimit,
}: LimitHighlightPluginProps) => {
  const [editor] = useLexicalComposerContext();
  const [boxes, setBoxes] = useState<Box[]>([]);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const limits: Limits = { wordLimit, charLimit };
    const recompute = (): void => {
      const overlay = overlayRef.current;
      if (overlay) setBoxes(measureBoxes(editor, overlay, limits));
    };
    const schedule = (): void => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(recompute);
    };

    schedule();
    const root = editor.getRootElement();
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    if (observer && root) observer.observe(root);
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    const unregister = editor.registerUpdateListener(schedule);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      observer?.disconnect();
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      unregister();
    };
  }, [editor, wordLimit, charLimit]);

  return (
    <div
      ref={overlayRef}
      data-testid="limit-highlight-overlay"
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{ opacity: 0.25 }}
    >
      {boxes.map((box) => (
        <div
          key={`${String(box.top)}:${String(box.left)}:${String(box.width)}`}
          className="absolute"
          style={{
            top: box.top,
            left: box.left,
            width: box.width,
            height: box.height,
            backgroundColor: 'var(--warning)',
          }}
        />
      ))}
    </div>
  );
};
