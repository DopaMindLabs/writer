import { db } from '@/db/db';
import type { Doc } from '@/db/schema';
import { InvariantError } from '@/lib/invariant';
import { collabSeedKey } from '@/lib/collab/seedKey';
import { sampleDoc, seedBasicSpace, serializedBody } from '@/test/fixtures';
import {
  createDoc,
  createDocs,
  ensureDocCrdtSeeded,
  renameDoc,
  restoreDocs,
  seedDocCrdt,
  setDocStatus,
  updateDocBody,
  updateDocMeta,
} from './docRepository';
import { readDocBodyBaseline } from './docBodyBaseline';
import { EMPTY_LEXICAL_JSON } from './emptyBody';

describe('docRepository', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await seedBasicSpace();
  });

  describe('createDoc', () => {
    it('creates a doc with an empty Lexical body, word count 0 and a fresh id', async () => {
      const doc = await createDoc({
        spaceId: 's1',
        sectionId: 'sec1',
        name: 'New doc',
      });
      expect(doc.id).toBeTruthy();
      expect(doc.body).toBe(EMPTY_LEXICAL_JSON);
      expect(doc.meta.wordCount).toBe(0);
      expect(doc.updatedAt).toBeGreaterThan(0);
      const stored = await db.docs.get(doc.id);
      expect(stored).toEqual(doc);
    });

    it('computes the word count from a non-empty body', async () => {
      const doc = await createDoc({
        spaceId: 's1',
        sectionId: 'sec1',
        name: 'Seeded',
        body: serializedBody('one two three'),
      });
      expect(doc.meta.wordCount).toBe(3);
    });

    it('leaves exactly one CRDT seed row and a seed marker', async () => {
      const doc = await createDoc({
        spaceId: 's1',
        sectionId: 'sec1',
        name: 'Seeded',
      });
      expect(await db.docUpdates.where('docId').equals(doc.id).count()).toBe(1);
      expect(await db.meta.get(collabSeedKey(doc.id))).toBeDefined();
    });

    it('throws when the space id is missing', async () => {
      await expect(
        createDoc({ spaceId: '', sectionId: 'sec1', name: 'x' }),
      ).rejects.toThrow(InvariantError);
    });

    it('throws when the section id is missing', async () => {
      await expect(
        createDoc({ spaceId: 's1', sectionId: '', name: 'x' }),
      ).rejects.toThrow(InvariantError);
    });
  });

  describe('ensureDocCrdtSeeded', () => {
    it('reseeds a wiped log from the body and is idempotent', async () => {
      const body = serializedBody('healed body');
      // Simulate the logout wipe: a body but no CRDT log / marker.
      expect(await db.docUpdates.where('docId').equals('d1').count()).toBe(0);

      expect(await ensureDocCrdtSeeded('d1', body)).toBe('seeded');
      expect(await db.docUpdates.where('docId').equals('d1').count()).toBe(1);
      expect(await db.meta.get(collabSeedKey('d1'))).toBeDefined();

      // A second call finds the log populated and does nothing.
      expect(await ensureDocCrdtSeeded('d1', body)).toBe('occupied');
      expect(await db.docUpdates.where('docId').equals('d1').count()).toBe(1);
    });

    it('leaves an already-seeded log untouched', async () => {
      await seedDocCrdt('d1', serializedBody('original'));
      const before = await db.docUpdates.where('docId').equals('d1').count();

      expect(await ensureDocCrdtSeeded('d1', serializedBody('other'))).toBe(
        'occupied',
      );
      expect(await db.docUpdates.where('docId').equals('d1').count()).toBe(
        before,
      );
    });
  });

  describe('createDocs', () => {
    it('bulk writes fully-formed rows verbatim', async () => {
      const rows: Doc[] = [
        { ...sampleDoc, id: 'a', name: 'A' },
        { ...sampleDoc, id: 'b', name: 'B', meta: { wordCount: 42 } },
      ];
      await createDocs(rows);
      expect(await db.docs.get('a')).toEqual(rows[0]);
      expect((await db.docs.get('b'))?.meta.wordCount).toBe(42);
    });

    it('is a no-op for an empty array', async () => {
      const before = await db.docs.count();
      await createDocs([]);
      expect(await db.docs.count()).toBe(before);
    });
  });

  describe('restoreDocs', () => {
    it('overwrites existing rows by id', async () => {
      await restoreDocs([{ ...sampleDoc, name: 'Restored' }]);
      expect((await db.docs.get(sampleDoc.id))?.name).toBe('Restored');
    });
  });

  describe('renameDoc', () => {
    it('trims the name and advances the timestamp', async () => {
      await renameDoc(sampleDoc.id, '  Trimmed  ');
      const doc = await db.docs.get(sampleDoc.id);
      expect(doc?.name).toBe('Trimmed');
      expect(doc?.updatedAt).toBeGreaterThan(sampleDoc.updatedAt);
    });

    it('is a no-op for a whitespace-only name', async () => {
      await renameDoc(sampleDoc.id, '   ');
      const doc = await db.docs.get(sampleDoc.id);
      expect(doc?.name).toBe(sampleDoc.name);
      expect(doc?.updatedAt).toBe(sampleDoc.updatedAt);
    });

    it('throws on an empty doc id', async () => {
      await expect(renameDoc('', 'Name')).rejects.toThrow(InvariantError);
    });
  });

  describe('updateDocBody', () => {
    it('writes the body, recomputes the word count and advances the timestamp', async () => {
      await updateDocBody(sampleDoc.id, serializedBody('alpha beta gamma delta'));
      const doc = await db.docs.get(sampleDoc.id);
      expect(doc?.body).toBe(serializedBody('alpha beta gamma delta'));
      expect(doc?.meta.wordCount).toBe(4);
      expect(doc?.updatedAt).toBeGreaterThan(sampleDoc.updatedAt);
    });

    it('throws on an empty doc id', async () => {
      await expect(updateDocBody('', serializedBody('x'))).rejects.toThrow(
        InvariantError,
      );
    });
  });

  describe('updateDocMeta', () => {
    it('sets meta fields via dotted paths and preserves the rest', async () => {
      await db.docs.update(sampleDoc.id, { meta: { wordCount: 5, status: 'draft' } });
      await updateDocMeta(sampleDoc.id, { wordLimit: 500 });
      const doc = await db.docs.get(sampleDoc.id);
      expect(doc?.meta.wordLimit).toBe(500);
      expect(doc?.meta.wordCount).toBe(5);
      expect(doc?.meta.status).toBe('draft');
      expect(doc?.updatedAt).toBeGreaterThan(sampleDoc.updatedAt);
    });

    it('clears a meta field when the value is undefined', async () => {
      await db.docs.update(sampleDoc.id, {
        meta: { wordCount: 5, wordLimit: 500 },
      });
      await updateDocMeta(sampleDoc.id, { wordLimit: undefined });
      const doc = await db.docs.get(sampleDoc.id);
      expect(doc?.meta.wordLimit).toBeUndefined();
      expect(doc?.meta.wordCount).toBe(5);
    });

    it('throws on an empty doc id', async () => {
      await expect(updateDocMeta('', { status: 'draft' })).rejects.toThrow(
        InvariantError,
      );
    });
  });

  describe('setDocStatus', () => {
    it('writes meta.status without disturbing other meta', async () => {
      await db.docs.update(sampleDoc.id, { meta: { wordCount: 9 } });
      await setDocStatus(sampleDoc.id, 'complete');
      const doc = await db.docs.get(sampleDoc.id);
      expect(doc?.meta.status).toBe('complete');
      expect(doc?.meta.wordCount).toBe(9);
    });
  });

  describe('body-provenance baseline', () => {
    it('createDoc records the body as the baseline', async () => {
      const doc = await createDoc({ spaceId: 's1', sectionId: 'sec1', name: 'x' });
      expect(await readDocBodyBaseline(doc.id)).toBe(doc.body);
    });

    it('updateDocBody advances the baseline to the new body', async () => {
      const doc = await createDoc({ spaceId: 's1', sectionId: 'sec1', name: 'x' });
      const next = serializedBody('updated content');
      await updateDocBody(doc.id, next);
      expect(await readDocBodyBaseline(doc.id)).toBe(next);
    });

    it('createDocs and restoreDocs record a baseline per row', async () => {
      const a: Doc = { ...sampleDoc, id: 'bulk-a', body: serializedBody('a') };
      const b: Doc = { ...sampleDoc, id: 'bulk-b', body: serializedBody('b') };
      await createDocs([a, b]);
      expect(await readDocBodyBaseline('bulk-a')).toBe(a.body);
      expect(await readDocBodyBaseline('bulk-b')).toBe(b.body);

      const restored: Doc = { ...a, body: serializedBody('a-restored') };
      await restoreDocs([restored]);
      expect(await readDocBodyBaseline('bulk-a')).toBe(restored.body);
    });

    it('rolls the body back when the baseline write fails, so neither advances', async () => {
      const doc = await createDoc({ spaceId: 's1', sectionId: 'sec1', name: 'x' });
      const originalBody = doc.body;
      const putSpy = vi
        .spyOn(db.meta, 'put')
        .mockRejectedValueOnce(new Error('meta write failed'));

      await expect(
        updateDocBody(doc.id, serializedBody('would-be new content')),
      ).rejects.toThrow();
      putSpy.mockRestore();

      expect((await db.docs.get(doc.id))?.body).toBe(originalBody);
      expect(await readDocBodyBaseline(doc.id)).toBe(originalBody);
    });
  });
});
