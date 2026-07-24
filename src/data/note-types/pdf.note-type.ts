import { NoteKind, NoteLayout } from '@/db/schema';
import { TemplateStage } from '@/data/templates/types';
import type { NoteTypeDescriptor } from './types';

// A PDF source note: a text note (title + body) anchored to a library PDF via
// `Note.mediaId`. Text layout — the source is a link to the viewer, not an
// inline image on the canvas.
const descriptor: NoteTypeDescriptor = {
  kind: NoteKind.Pdf,
  label: 'PDF',
  layout: NoteLayout.Text,
  version: '1.0.0',
  stage: TemplateStage.Beta,
  toolbarOrder: 120,
};

export default descriptor;
