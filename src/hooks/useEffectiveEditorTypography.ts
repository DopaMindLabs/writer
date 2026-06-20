import { useUI } from '@/store/ui';
import type { Doc } from '@/db/schema';
import {
  sanitizeEditorFont,
  sanitizeEditorSize,
  type EditorFont,
  type EditorSize,
} from '@/lib/editorTypography';

export interface EffectiveEditorTypography {
  font: EditorFont;
  size: EditorSize;
  fontIsOverridden: boolean;
  sizeIsOverridden: boolean;
}

export const useEffectiveEditorTypography = (
  doc?: Pick<Doc, 'editorFont' | 'editorSize'> | null,
): EffectiveEditorTypography => {
  const uiFont = useUI((s) => s.editorFont);
  const uiSize = useUI((s) => s.editorSize);
  const fontOverride = doc?.editorFont;
  const sizeOverride = doc?.editorSize;
  return {
    font: fontOverride ? sanitizeEditorFont(fontOverride) : uiFont,
    size: sizeOverride ? sanitizeEditorSize(sizeOverride) : uiSize,
    fontIsOverridden: fontOverride !== undefined,
    sizeIsOverridden: sizeOverride !== undefined,
  };
};
