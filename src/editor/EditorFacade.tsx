import { LexicalEditor } from './LexicalEditor';

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
}

export const Editor = (props: EditorProps) => {
  return <LexicalEditor {...props} />;
};
