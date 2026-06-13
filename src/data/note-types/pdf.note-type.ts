import { NoteKind, NoteLayout } from '@/db/schema';
import { TemplateStage } from '@/data/templates/types';
import type { NoteTypeDescriptor } from './types';

const descriptor: NoteTypeDescriptor = {
  kind: NoteKind.Pdf,
  label: 'PDF',
  layout: NoteLayout.Pdf,
  version: '1.0.0',
  stage: TemplateStage.Beta,
  toolbarOrder: 120,
};

export default descriptor;
