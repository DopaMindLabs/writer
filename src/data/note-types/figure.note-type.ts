import { NoteKind, NoteLayout } from '@/db/schema';
import type { NoteTypeDescriptor } from './types';

const descriptor: NoteTypeDescriptor = {
  kind: NoteKind.Figure,
  label: 'figure',
  layout: NoteLayout.Text,
  version: '1.0.0',
  toolbarOrder: 70,
};

export default descriptor;
