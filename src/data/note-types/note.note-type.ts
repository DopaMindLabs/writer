import { NoteKind, NoteLayout } from '@/db/schema';
import type { NoteTypeDescriptor } from './types';

const descriptor: NoteTypeDescriptor = {
  kind: NoteKind.Note,
  label: 'thought',
  layout: NoteLayout.Text,
  version: '1.0.0',
  toolbarOrder: 0,
};

export default descriptor;
