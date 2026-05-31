import { NoteKind, NoteLayout } from '@/db/schema';
import type { NoteTypeDescriptor } from './types';

const descriptor: NoteTypeDescriptor = {
  kind: NoteKind.Place,
  label: 'place',
  layout: NoteLayout.Text,
  version: '1.0.0',
  toolbarOrder: 20,
};

export default descriptor;
