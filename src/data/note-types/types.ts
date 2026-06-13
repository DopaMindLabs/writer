import { NoteLayout, type NoteKind } from '@/db/schema';
import type { TemplateStage } from '@/data/templates/types';

export interface NoteLayoutConfig {
  allowsText: boolean;
  allowsImages: boolean;
  imageFirst: boolean;
  pdfRefFirst?: boolean;
}

export const NOTE_LAYOUT_CONFIG: Record<NoteLayout, NoteLayoutConfig> = {
  [NoteLayout.Text]: { allowsText: true, allowsImages: true, imageFirst: false },
  [NoteLayout.Image]: { allowsText: false, allowsImages: true, imageFirst: true },
  [NoteLayout.PdfRef]: {
    allowsText: true,
    allowsImages: false,
    imageFirst: false,
    pdfRefFirst: true,
  },
};

export interface NoteTypeDescriptor {
  kind: NoteKind;
  label: string;
  layout: NoteLayout;
  version: string;
  stage?: TemplateStage;
  toolbarOrder?: number;
}
