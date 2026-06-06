import * as bibParser from '@retorquere/bibtex-parser';
import { db } from '@/db/db';
import { newId } from './ids';
import type { Citation } from '@/db/schema';

interface Creator {
  name?: string;
  firstName?: string;
  lastName?: string;
  prefix?: string;
  suffix?: string;
}

interface RawEntry {
  key?: string;
  type?: string;
  fields?: Record<string, unknown>;
}

const stringField = (v: unknown): string | undefined => {
  if (typeof v === 'string') return v.trim();
  if (Array.isArray(v) && typeof v[0] === 'string') return (v[0]).trim();
  return undefined;
};

const numberField = (v: unknown): number | undefined => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const m = /\d{4}/.exec(v);
    if (m) return parseInt(m[0], 10);
  }
  return undefined;
};

const formatCreator = (c: Creator): string => {
  if (c.name) return c.name;
  if (c.lastName === 'others' && !c.firstName) return 'et al.';
  return [c.prefix, c.firstName, c.lastName, c.suffix].filter(Boolean).join(' ');
};

const extractAuthors = (fields: Record<string, unknown>): string => {
  const author = fields.author;
  if (Array.isArray(author) && author.length > 0 && typeof author[0] === 'object') {
    const names = (author as Creator[]).map(formatCreator).filter(Boolean);
    if (names.length > 0) return names.join(', ');
  }
  return stringField(author) ?? '(unknown)';
};

const mapType = (type: string | undefined): Citation['type'] => {
  switch (type) {
    case 'book':
    case 'booklet':
      return 'book';
    case 'article':
    case 'inproceedings':
    case 'conference':
      return 'article';
    case 'inbook':
    case 'incollection':
      return 'chapter';
    case undefined:
      return 'misc';
    default:
      return 'misc';
  }
};

export const parseBibtexText = (
  text: string,
  spaceId: string,
): Promise<Citation[]> => {
  const parsed = (bibParser as unknown as { parse: (s: string) => { entries?: RawEntry[] } }).parse(text);
  const out: Citation[] = [];
  for (const entry of parsed.entries ?? []) {
    if (!entry.key) continue;
    const fields = entry.fields ?? {};
    out.push({
      id: newId(),
      spaceId,
      key: entry.key,
      authors: extractAuthors(fields),
      title: stringField(fields.title) ?? '(untitled)',
      year: numberField(fields.year ?? fields.date) ?? 0,
      type: mapType(entry.type),
      useCount: 0,
      // `raw` is intentionally omitted: the parser exposes no per-entry source,
      // and storing a slice of the whole file on every row duplicated up to 10KB
      // per citation for no benefit.
    });
  }
  return Promise.resolve(out);
};

export const parseBibtexFile = async (
  file: File,
  spaceId: string,
): Promise<Citation[]> => {
  const text = await file.text();
  return parseBibtexText(text, spaceId);
};

export const importCitations = async (
  citations: Citation[],
): Promise<{ added: number; skipped: number }> => {
  if (citations.length === 0) return { added: 0, skipped: 0 };

  let added = 0;
  let skipped = 0;
  await db.transaction('rw', db.citations, async () => {
    // Group by space so each space's existing keys are checked in one indexed
    // batch query instead of one lookup per incoming citation.
    const bySpace = new Map<string, Citation[]>();
    for (const c of citations) {
      const list = bySpace.get(c.spaceId);
      if (list) list.push(c);
      else bySpace.set(c.spaceId, [c]);
    }

    const toAdd: Citation[] = [];
    for (const [spaceId, group] of bySpace) {
      const pairs = group.map((c) => [spaceId, c.key] as [string, string]);
      const existingRows = await db.citations
        .where('[spaceId+key]')
        .anyOf(pairs)
        .toArray();
      // Keys are unique within a space, so a per-space set of keys covers both
      // rows already in the DB and keys repeated earlier in this same import —
      // a file with duplicate keys yields a single row.
      const seen = new Set(existingRows.map((r) => r.key));
      for (const c of group) {
        if (seen.has(c.key)) {
          skipped += 1;
          continue;
        }
        seen.add(c.key);
        toAdd.push(c);
        added += 1;
      }
    }

    if (toAdd.length > 0) await db.citations.bulkAdd(toAdd);
  });
  return { added, skipped };
};

const bibtexTypeFor = (c: Citation): string => {
  switch (c.type) {
    case 'book':
      return 'book';
    case 'article':
      return 'article';
    case 'chapter':
      return 'incollection';
    case 'misc':
      return 'misc';
    default:
      return 'misc';
  }
};

const escapeBraces = (s: string): string => {
  return s.replace(/[{}]/g, '');
};

export const serializeCitationsToBibtex = (citations: Citation[]): string => {
  const parts: string[] = [];
  for (const c of citations) {
    const fields: string[] = [];
    if (c.authors && c.authors !== '(unknown)') {
      fields.push(`  author = {${escapeBraces(c.authors)}}`);
    }
    if (c.title && c.title !== '(untitled)') {
      fields.push(`  title  = {${escapeBraces(c.title)}}`);
    }
    if (c.year > 0) {
      fields.push(`  year   = {${String(c.year)}}`);
    }
    parts.push(`@${bibtexTypeFor(c)}{${c.key},\n${fields.join(',\n')}\n}`);
  }
  return parts.join('\n\n') + (parts.length > 0 ? '\n' : '');
};
