import { NoteKind, NoteLayout } from '@/db/schema';
import type { NoteTypeDescriptor } from './types';

const descriptor: NoteTypeDescriptor = {
  kind: NoteKind.Claim,
  label: 'claim',
  layout: NoteLayout.Text,
  version: '1.0.0',
  toolbarOrder: 60,
};

export default descriptor;
