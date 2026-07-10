import { NoteKind, NoteLayout } from '@/db/schema';
import type { NoteTypeDescriptor } from './types';

const descriptor: NoteTypeDescriptor = {
  kind: NoteKind.Char,
  label: 'person',
  layout: NoteLayout.Text,
  version: '1.0.0',
  toolbarOrder: 10,
};

export default descriptor;
