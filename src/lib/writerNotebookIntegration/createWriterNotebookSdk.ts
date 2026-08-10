import type { LoremDB } from '@/db/LoremDB';
import { db } from '@/db/db';
import { newId } from '@/lib/ids';
import { createNotebookSdk, type NotebookSdk } from 'writer-notebook/core';
import { createWriterNotebookStore } from './writerNotebookStore';
import { WRITER_NOTEBOOK_LIMITS } from './writerNotebookLimits';

export const createWriterNotebookSdk = (
  spaceId: string,
  database: LoremDB = db,
): NotebookSdk =>
  createNotebookSdk({
    store: createWriterNotebookStore(spaceId, database),
    ids: { next: newId },
    clock: { now: Date.now },
    limits: WRITER_NOTEBOOK_LIMITS,
  });
