export type EditorFont = 'serif' | 'sans' | 'mono';
export type EditorSize = 'sm' | 'base' | 'lg' | 'xl';

export const EDITOR_FONTS: readonly EditorFont[] = ['serif', 'sans', 'mono'];
export const EDITOR_SIZES: readonly EditorSize[] = ['sm', 'base', 'lg', 'xl'];

export const DEFAULT_EDITOR_FONT: EditorFont = 'serif';
export const DEFAULT_EDITOR_SIZE: EditorSize = 'base';

const FONT_STACKS: Record<EditorFont, string> = {
  serif: '"Source Serif 4", Georgia, serif',
  sans: 'Geist, system-ui, -apple-system, sans-serif',
  mono: '"Geist Mono", ui-monospace, monospace',
};

const SIZE_SCALES: Record<EditorSize, number> = {
  sm: 0.9,
  base: 1,
  lg: 1.12,
  xl: 1.24,
};

export const editorFontStack = (font: EditorFont): string => FONT_STACKS[font];

export const editorSizeScale = (size: EditorSize): number => SIZE_SCALES[size];

export const sanitizeEditorFont = (v: unknown): EditorFont =>
  typeof v === 'string' && (EDITOR_FONTS as readonly string[]).includes(v)
    ? (v as EditorFont)
    : DEFAULT_EDITOR_FONT;

export const sanitizeEditorSize = (v: unknown): EditorSize =>
  typeof v === 'string' && (EDITOR_SIZES as readonly string[]).includes(v)
    ? (v as EditorSize)
    : DEFAULT_EDITOR_SIZE;
