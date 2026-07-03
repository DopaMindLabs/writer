import type { RefObject } from 'react';
import type { ProviderFactory } from '@/lib/collab/yjs/providerFactory';
import { LexicalEditor } from './LexicalEditor';

export type EditorMode = 'write' | 'focus' | 'read';

export interface EditorProps {
  docId: string;
  providerFactory: ProviderFactory;
  username: string;
  cursorColor: string;
  cursorsContainerRef: RefObject<HTMLElement | null>;
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
