import type { DocSyncSession } from '@/lib/docsync/ports';
import { LexicalEditor } from './LexicalEditor';

export type EditorMode = 'write' | 'focus' | 'read';

export interface EditorProps {
  /** Vendor-neutral session opened by `useDocSyncSession`. */
  session: DocSyncSession;
  /** Serialised Lexical JSON used to seed a fresh document. */
  initialSerialized: string;
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
