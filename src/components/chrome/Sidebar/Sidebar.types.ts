import type { KeyboardEvent, RefObject } from 'react';

export interface SidebarProps {
  spaceId: string;
  activeDocId: string | null;
  className?: string;
}

export interface AddingState {
  sectionId: string;
  value: string;
}

export type TranslateFn = (
  key: string,
  options?: Record<string, unknown>,
) => string;

export interface AddController {
  adding: AddingState | null;
  inputRef: RefObject<HTMLInputElement | null>;
  onChange: (value: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onBlur: () => void;
}

export interface AddSectionController {
  adding: boolean;
  value: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onStart: () => void;
  onChange: (value: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onBlur: () => void;
}

export interface InlineRename {
  editing: boolean;
  draft: string;
  setDraft: (next: string) => void;
  beginEdit: () => void;
  commit: () => Promise<void>;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
}
