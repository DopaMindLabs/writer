import { db } from '@/db/db';
import type { Citation } from '@/db/schema';
import {
  importCitations,
  parseBibtexFile,
  parseBibtexText,
  serializeCitationsToBibtex,
} from './bibtex';

const SAMPLE = `
@article{smith2020,
  author = {Smith, John and Doe, Jane},
  title = {On the nature of testing},
  year = {2020},
}

@book{jones1999,
  author = {Jones, Mary},
  title = {A reference book},
  year = {1999},
}

@incollection{nokey2010,
  author = {No One},
  title = {A chapter},
  year = {2010},
}

@misc{minimal,
}
`;

describe('parseBibtexText', () => {
  it('parses entries with mapped types', async () => {
    const out = await parseBibtexText(SAMPLE, 's1');
    const byKey = Object.fromEntries(out.map((c) => [c.key, c]));
    expect(out).toHaveLength(4);
    expect(byKey.smith2020.type).toBe('article');
    expect(byKey.jones1999.type).toBe('book');
    expect(byKey.nokey2010.type).toBe('chapter');
    expect(byKey.minimal.type).toBe('misc');
  });

  it('extracts year as number from string fields', async () => {
    const out = await parseBibtexText(SAMPLE, 's1');
    const smith = out.find((c) => c.key === 'smith2020');
    expect(smith?.year).toBe(2020);
  });

  it('joins multiple authors with commas', async () => {
    const out = await parseBibtexText(SAMPLE, 's1');
    const smith = out.find((c) => c.key === 'smith2020');
    expect(smith?.authors).toBe('John Smith, Jane Doe');
  });

  it('handles name particles (van) and "and others"', async () => {
    const text = `@article{lobbezoo2013,
  title = {Prognosis},
  author = {Lobbezoo, Dorien JA and van Kampen, Roel JW and others},
  year = {2013}
}`;
    const out = await parseBibtexText(text, 's1');
    expect(out[0].authors).toBe('Dorien JA Lobbezoo, van Roel JW Kampen, et al.');
  });

  it('falls back to (untitled) and (unknown) for missing fields', async () => {
    const out = await parseBibtexText(SAMPLE, 's1');
    const minimal = out.find((c) => c.key === 'minimal');
    expect(minimal?.title).toBe('(untitled)');
    expect(minimal?.authors).toBe('(unknown)');
    expect(minimal?.year).toBe(0);
  });

  it('returns empty array on empty input', async () => {
    const out = await parseBibtexText('', 's1');
    expect(out).toEqual([]);
  });

});

describe('parseBibtexFile', () => {
  it('reads File text and delegates to parseBibtexText', async () => {
    const file = new File(
      ['@article{f1, author = {A, B}, title = {File}, year = {2024}}'],
      'in.bib',
      { type: 'application/x-bibtex' },
    );
    const out = await parseBibtexFile(file, 's1');
    expect(out).toHaveLength(1);
    expect(out[0].key).toBe('f1');
  });

  it('returns empty array for an empty file', async () => {
    const file = new File([''], 'empty.bib', {
      type: 'application/x-bibtex',
    });
    const out = await parseBibtexFile(file, 's1');
    expect(out).toEqual([]);
  });
});

describe('serializeCitationsToBibtex', () => {
  it('round-trips a typical citation', () => {
    const c: Citation = {
      id: 'x1',
      spaceId: 's1',
      key: 'smith2020',
      authors: 'Smith, John',
      title: 'A title',
      year: 2020,
      type: 'article',
      useCount: 0,
    };
    const out = serializeCitationsToBibtex([c]);
    expect(out).toContain('@article{smith2020,');
    expect(out).toContain('author = {Smith, John}');
    expect(out).toContain('title  = {A title}');
    expect(out).toContain('year   = {2020}');
  });

  it('maps internal types to bibtex types', () => {
    const make = (type: Citation['type']): Citation => ({
      id: type,
      spaceId: 's1',
      key: type,
      authors: 'A',
      title: 'T',
      year: 2020,
      type,
      useCount: 0,
    });
    const out = serializeCitationsToBibtex([
      make('book'),
      make('chapter'),
      make('misc'),
    ]);
    expect(out).toContain('@book{book');
    expect(out).toContain('@incollection{chapter');
    expect(out).toContain('@misc{misc');
  });

  it('omits placeholder author/title and zero year', () => {
    const c: Citation = {
      id: 'x',
      spaceId: 's1',
      key: 'empty',
      authors: '(unknown)',
      title: '(untitled)',
      year: 0,
      type: 'misc',
      useCount: 0,
    };
    const out = serializeCitationsToBibtex([c]);
    expect(out).not.toContain('author');
    expect(out).not.toContain('title');
    expect(out).not.toContain('year');
  });

  it('escapes braces in field values', () => {
    const c: Citation = {
      id: 'x',
      spaceId: 's1',
      key: 'k',
      authors: 'A {weird} name',
      title: 'T',
      year: 2020,
      type: 'misc',
      useCount: 0,
    };
    const out = serializeCitationsToBibtex([c]);
    expect(out).toContain('author = {A weird name}');
  });

  it('returns empty string for empty input', () => {
    expect(serializeCitationsToBibtex([])).toBe('');
  });
});

describe('importCitations', () => {
  it('adds all entries on first call and skips duplicates on second', async () => {
    const cs = await parseBibtexText(SAMPLE, 's1');
    const first = await importCitations(cs);
    expect(first.added).toBe(4);
    expect(first.skipped).toBe(0);
    expect(await db.citations.count()).toBe(4);

    const second = await importCitations(cs);
    expect(second.added).toBe(0);
    expect(second.skipped).toBe(4);
    expect(await db.citations.count()).toBe(4);
  });
});
