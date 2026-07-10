import { NoteLayout, type NoteKind } from '@/db/schema';
import type { TemplateStage } from '@/data/templates/types';

export interface NoteLayoutConfig {
  allowsText: boolean;
  allowsImages: boolean;
  imageFirst: boolean;
}

export const NOTE_LAYOUT_CONFIG: Record<NoteLayout, NoteLayoutConfig> = {
  [NoteLayout.Text]: { allowsText: true, allowsImages: true, imageFirst: false },
  [NoteLayout.Image]: { allowsText: false, allowsImages: true, imageFirst: true },
};

export interface NoteTypeDescriptor {
  kind: NoteKind;
  label: string;
  layout: NoteLayout;
  version: string;
  stage?: TemplateStage;
  toolbarOrder?: number;
}
