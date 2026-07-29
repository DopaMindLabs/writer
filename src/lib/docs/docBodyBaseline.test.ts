import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/db';
import {
  docBodyBaselineKey,
  readDocBodyBaseline,
  writeDocBodyBaseline,
  deleteDocBodyBaseline,
} from './docBodyBaseline';

describe('docBodyBaseline', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('namespaces the key by document id', () => {
    expect(docBodyBaselineKey('d1')).toBe('doc-body-baseline:d1');
  });

  it('is null before anything is written', async () => {
    expect(await readDocBodyBaseline('d1')).toBeNull();
  });

  it('round-trips a written baseline', async () => {
    await writeDocBodyBaseline('d1', 'the last local body');
    expect(await readDocBodyBaseline('d1')).toBe('the last local body');
  });

  it('overwrites a prior baseline', async () => {
    await writeDocBodyBaseline('d1', 'first');
    await writeDocBodyBaseline('d1', 'second');
    expect(await readDocBodyBaseline('d1')).toBe('second');
  });

  it('deletes a baseline back to null', async () => {
    await writeDocBodyBaseline('d1', 'body');
    await deleteDocBodyBaseline('d1');
    expect(await readDocBodyBaseline('d1')).toBeNull();
  });

  it('treats a non-string stored value as absent', async () => {
    await db.meta.put({ key: docBodyBaselineKey('d1'), value: 42 });
    expect(await readDocBodyBaseline('d1')).toBeNull();
  });
});
