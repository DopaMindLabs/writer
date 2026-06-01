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

// A non-destructive overlay that paints a warning-coloured highlight behind any
// text beyond the document's word/character limit. It never mutates the
// document (no node splitting, no formatting), so nothing is persisted or
// cropped: on each change it recomputes a DOM range from the over-limit
// boundary to the end of the document and paints that range's client rects.

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

// Reads the editor state for the over-limit range and returns its client rects
// (viewport coordinates). Runs inside editor.read() so the Lexical nodes are
// valid; returns an empty list when nothing is over the limit.
const readOverLimitRects = (editor: LexicalEditor, limits: Limits) => {
  const segments: TextSegment[] = [];
  let lastTextNode: TextNode | null = null;
  // A plain loop (not forEach) so TypeScript tracks the lastTextNode assignment.
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
  // Use the range's own client rects rather than @lexical/selection's
  // createRectsFromDOMRange: that helper drops any rect spanning the full
  // content width, which with justified prose removes most lines and leaves
  // the highlight scattered across only the ragged lines.
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
    // The overlay renders after the ContentEditable in the editor surface, so it
    // paints ABOVE the text and tints it translucently. It must not use a
    // negative z-index: the surface forms no stacking context, so that would
    // push the highlight behind the page paper and hide it entirely.
    <div
      ref={overlayRef}
      data-testid="limit-highlight-overlay"
      aria-hidden
      className="pointer-events-none absolute inset-0"
      // Opacity on the layer (not each box) so adjacent/overlapping line rects
      // read as one even tint instead of doubling up where they meet.
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
