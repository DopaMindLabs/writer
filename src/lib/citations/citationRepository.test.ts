import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/db';
import { sampleCitation, seedBasicSpace } from '@/test/fixtures';
import { setCitationsType } from './citationRepository';

describe('setCitationsType', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await seedBasicSpace();
    await db.citations.bulkPut([
      sampleCitation,
      { ...sampleCitation, id: 'cit2', key: 'roe2021' },
    ]);
  });

  it('retypes every citation it is given', async () => {
    await setCitationsType(['cit1', 'cit2'], 'book');

    const rows = await db.citations.bulkGet(['cit1', 'cit2']);
    expect(rows.map((row) => row?.type)).toEqual(['book', 'book']);
  });

  it('gives each retyped citation its own fresh mutation id', async () => {
    await setCitationsType(['cit1', 'cit2'], 'chapter');

    const rows = await db.citations.bulkGet(['cit1', 'cit2']);
    const ids = rows.map((row) => row?.mutationId);
    expect(new Set(ids).size).toBe(2);
    expect(ids).not.toContain(sampleCitation.mutationId);
  });

  it('writes nothing when no citation is selected', async () => {
    await setCitationsType([], 'misc');

    expect((await db.citations.get('cit1'))?.type).toBe(sampleCitation.type);
  });
});
