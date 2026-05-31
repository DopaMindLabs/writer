import { NoteKind, NoteLayout } from '@/db/schema';
import type { NoteTypeDescriptor } from './types';

const descriptor: NoteTypeDescriptor = {
  kind: NoteKind.LooseEnd,
  label: 'loose end',
  layout: NoteLayout.Text,
  version: '1.0.0',
  toolbarOrder: 90,
};

export default descriptor;
