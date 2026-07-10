import { NoteKind, NoteLayout } from '@/db/schema';
import type { NoteTypeDescriptor } from './types';

const descriptor: NoteTypeDescriptor = {
  kind: NoteKind.Blank,
  label: 'blank',
  layout: NoteLayout.Text,
  version: '1.0.0',
  toolbarOrder: 100,
};

export default descriptor;
