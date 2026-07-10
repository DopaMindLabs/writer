import { NoteKind, NoteLayout } from '@/db/schema';
import type { NoteTypeDescriptor } from './types';

const descriptor: NoteTypeDescriptor = {
  kind: NoteKind.Question,
  label: 'question',
  layout: NoteLayout.Text,
  version: '1.0.0',
  toolbarOrder: 40,
};

export default descriptor;
