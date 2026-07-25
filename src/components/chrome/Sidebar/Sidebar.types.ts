import type { KeyboardEvent, RefObject } from 'react';
import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from '@/components/libs/dnd';

/**
 * The props a sortable wrapper hands to the element that should act as the drag
 * grab surface (press-and-move to drag — long-press on touch — and focusable
 * for keyboard reordering).
 */
export interface DragActivator {
  ref: (element: HTMLElement | null) => void;
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
}

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
