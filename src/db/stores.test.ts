import { describe, it, expect } from 'vitest';
import { STORES, BASE_STORES, PDF_STORES } from './stores';
import { LoremDB } from './LoremDB';

describe('STORES', () => {
  it('is applied as a table on LoremDB for every entry', async () => {
    const db = new LoremDB('stores-spec-test');
    await db.open();
    expect(db.tables.map((t) => t.name).sort()).toEqual(
      Object.keys(STORES).sort(),
    );
    await db.delete();
  });

  it('keeps docUpdates as the only auto-increment table', () => {
    const autoIncrement = Object.entries(STORES)
      .filter(([, spec]) => spec.trimStart().startsWith('++'))
      .map(([name]) => name);
    expect(autoIncrement).toEqual(['docUpdates']);
  });

  it('keeps the base version(1) schema free of the PDF tables', () => {
    expect('media' in BASE_STORES).toBe(false);
    expect('pdfAnnotations' in BASE_STORES).toBe(false);
    expect('media' in PDF_STORES).toBe(true);
    expect('pdfAnnotations' in PDF_STORES).toBe(true);
  });

  it('merges base and PDF specs into the full STORES map', () => {
    expect(STORES).toEqual({ ...BASE_STORES, ...PDF_STORES });
  });
});
