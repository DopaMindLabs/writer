import { NoteKind, NoteLayout } from '@/db/schema';
import { TemplateStage } from '@/data/templates/types';
import type { NoteTypeDescriptor } from './types';

const descriptor: NoteTypeDescriptor = {
  kind: NoteKind.Image,
  label: 'image',
  layout: NoteLayout.Image,
  version: '1.0.0',
  stage: TemplateStage.Beta,
  toolbarOrder: 110,
};

export default descriptor;
