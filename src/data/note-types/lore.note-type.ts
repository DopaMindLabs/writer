import { NoteKind, NoteLayout } from '@/db/schema';
import type { NoteTypeDescriptor } from './types';

const descriptor: NoteTypeDescriptor = {
  kind: NoteKind.Lore,
  label: 'lore',
  layout: NoteLayout.Text,
  version: '1.0.0',
  toolbarOrder: 30,
};

export default descriptor;
