import { NoteKind, NoteLayout } from '@/db/schema';
import type { NoteTypeDescriptor } from './types';

const descriptor: NoteTypeDescriptor = {
  kind: NoteKind.Source,
  label: 'source',
  layout: NoteLayout.Text,
  version: '1.0.0',
  toolbarOrder: 50,
};

export default descriptor;
