import { useUI } from '@/store/ui';
import { useA11y } from '@/store/a11y';
import type { Doc } from '@/db/schema';
import {
  a11yTextScaleMultiplier,
  editorSizeScale,
  sanitizeEditorFont,
  sanitizeEditorSize,
  type EditorFont,
  type EditorSize,
} from '@/lib/editorTypography';

export interface EffectiveEditorTypography {
  font: EditorFont;
  size: EditorSize;
  sizeScale: number;
  followA11y: boolean;
  fontIsOverridden: boolean;
  sizeIsOverridden: boolean;
}

export const useEffectiveEditorTypography = (
  doc?: Pick<Doc, 'editorFont' | 'editorSize'> | null,
): EffectiveEditorTypography => {
  const uiFont = useUI((s) => s.editorFont);
  const uiSize = useUI((s) => s.editorSize);
  const followA11y = useUI((s) => s.editorSizeFollowsA11y);
  const a11yTextScale = useA11y((s) => s.textScale);
  const fontOverride = doc?.editorFont;
  const sizeOverride = doc?.editorSize;
  const font = fontOverride ? sanitizeEditorFont(fontOverride) : uiFont;
  const size = sizeOverride ? sanitizeEditorSize(sizeOverride) : uiSize;
  const baseScale = editorSizeScale(size);
  const a11yMultiplier = followA11y ? a11yTextScaleMultiplier(a11yTextScale) : 1;
  return {
    font,
    size,
    sizeScale: baseScale * a11yMultiplier,
    followA11y,
    fontIsOverridden: fontOverride !== undefined,
    sizeIsOverridden: sizeOverride !== undefined,
  };
};
