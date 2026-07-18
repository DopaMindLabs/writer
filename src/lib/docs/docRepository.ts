import { db } from '@/db/db';
import type { Doc } from '@/db/schema';
import { invariant } from '@/lib/invariant';
import { countWords } from '@/editor/wordCount';
import { newId } from '@/lib/ids';
import { collabStore } from '@/lib/collab/collabStore';
import { seedFromLexicalJson } from '@/lib/collab/yjs/seed';
import { writeDocBodyBaseline } from './docBodyBaseline';
import { EMPTY_LEXICAL_JSON } from './emptyBody';

/**
 * The single write path for the `docs` table. Every mutation of a document —
 * creation, body edits, metadata, rename, bulk seed/restore — flows through
 * here so later stages can intercept it (CRDT seeding, cross-tab sync) in one
 * place rather than at the scattered call sites. Reads stay on `db.docs`.
 */

/**
 * Plant a document's CRDT seed so its update log is never empty at editor-open
 * time. Runs a headless editor, so it must **not** be called inside a Dexie
 * transaction — seed after the row write commits. Idempotent via `trySeed`.
 */
export const seedDocCrdt = async (docId: string, body: string): Promise<void> => {
  await collabStore.trySeed(docId, seedFromLexicalJson(docId, body));
};

/** Seed a batch of freshly-written docs (bulk create/import). Transaction-free. */
export const seedDocsCrdt = async (
  docs: readonly Pick<Doc, 'id' | 'body'>[],
): Promise<void> => {
  for (const doc of docs) await seedDocCrdt(doc.id, doc.body);
};

/**
 * Repair a document whose CRDT log was lost (e.g. the cloud addon cleared the
 * local-only tables on sign-out): reseed from the row body, but only if the log
 * is genuinely empty. The seed is computed by a headless editor **before** the
 * store's transaction opens, so no editor runs inside it. Returns whether it
 * planted a seed or found the log already populated.
 */
export const ensureDocCrdtSeeded = async (
  docId: string,
  body: string,
): Promise<'seeded' | 'occupied'> =>
  collabStore.reseedIfEmpty(docId, seedFromLexicalJson(docId, body));

export interface CreateDocInput {
  spaceId: string;
  sectionId: string;
  name: string;
  /** Serialized Lexical JSON; defaults to {@link EMPTY_LEXICAL_JSON}. */
  body?: string;
}

export const createDoc = async (input: CreateDocInput): Promise<Doc> => {
  invariant(input.spaceId, 'createDoc: spaceId is required');
  invariant(input.sectionId, 'createDoc: sectionId is required');
  const body = input.body ?? EMPTY_LEXICAL_JSON;
  const doc: Doc = {
    id: newId(),
    spaceId: input.spaceId,
    sectionId: input.sectionId,
    name: input.name,
    body,
    meta: { wordCount: countWords(body) },
    updatedAt: Date.now(),
  };
  await db.transaction('rw', db.docs, db.meta, async () => {
    await db.docs.add(doc);
    await writeDocBodyBaseline(doc.id, doc.body);
  });
  await seedDocCrdt(doc.id, doc.body);
  return doc;
};

/** Bulk-write fully-formed rows (import/seed): each row is stored verbatim. */
export const createDocs = async (docs: Doc[]): Promise<void> => {
  if (docs.length === 0) return;
  await db.transaction('rw', db.docs, db.meta, async () => {
    await db.docs.bulkPut(docs);
    for (const doc of docs) await writeDocBodyBaseline(doc.id, doc.body);
  });
};

/** Replace existing rows by id (space archive restore). */
export const restoreDocs = async (docs: Doc[]): Promise<void> => {
  if (docs.length === 0) return;
  await db.transaction('rw', db.docs, db.meta, async () => {
    await db.docs.bulkPut(docs);
    for (const doc of docs) await writeDocBodyBaseline(doc.id, doc.body);
  });
};

export const renameDoc = async (docId: string, name: string): Promise<void> => {
  invariant(docId, 'renameDoc: docId is required');
  const next = name.trim();
  if (!next) return;
  await db.docs.update(docId, { name: next, updatedAt: Date.now() });
};

export const updateDocBody = async (
  docId: string,
  serialized: string,
): Promise<void> => {
  invariant(docId, 'updateDocBody: docId is required');
  await db.transaction('rw', db.docs, db.meta, async () => {
    await db.docs.update(docId, {
      body: serialized,
      updatedAt: Date.now(),
      'meta.wordCount': countWords(serialized),
    });
    await writeDocBodyBaseline(docId, serialized);
  });
};

/**
 * Record that a pulled `docs.body` was accepted into the local CRDT, updating the
 * body-provenance baseline **without** pretending it was a local mutation (no
 * `updatedAt` bump). Call only after the CRDT restore/reseed has succeeded.
 */
export const acceptPulledDocBody = async (
  docId: string,
  body: string,
): Promise<void> => {
  invariant(docId, 'acceptPulledDocBody: docId is required');
  await writeDocBodyBaseline(docId, body);
};

export const updateDocMeta = async (
  docId: string,
  meta: Partial<Doc['meta']>,
): Promise<void> => {
  invariant(docId, 'updateDocMeta: docId is required');
  const changes: Record<string, unknown> = { updatedAt: Date.now() };
  for (const [key, value] of Object.entries(meta)) {
    changes[`meta.${key}`] = value;
  }
  await db.docs.update(docId, changes);
};

export const setDocStatus = async (
  docId: string,
  status: string,
): Promise<void> => {
  await updateDocMeta(docId, { status });
};
