import { LexicalEditor } from './LexicalEditor';
import type { EditorFont, EditorSize } from '@/lib/editorTypography';

export type EditorMode = 'write' | 'focus' | 'read';

export interface EditorProps {
  initialValue: string;
  onChange: (serialized: string) => void;
  mode: EditorMode;
  placeholder?: string;
  autoFocus?: boolean;
  locked?: boolean;
  wordLimit?: number;
  charLimit?: number;
  font: EditorFont;
  size: EditorSize;
  sizeScale: number;
  followA11y: boolean;
}

export const Editor = (props: EditorProps) => {
  return <LexicalEditor {...props} />;
};
