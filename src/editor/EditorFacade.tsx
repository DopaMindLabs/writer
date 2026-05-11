import { LexicalEditor } from './LexicalEditor';

export type EditorMode = 'normal' | 'focus';

export interface EditorProps {
  initialValue: string;
  onChange: (serialized: string) => void;
  mode: EditorMode;
  placeholder?: string;
  autoFocus?: boolean;
}

export function Editor(props: EditorProps) {
  return <LexicalEditor {...props} />;
}
