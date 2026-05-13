import * as bibParser from '@retorquere/bibtex-parser';
import { db } from '@/db/db';
import { newId } from './ids';
import type { Citation } from '@/db/schema';

type RawEntry = {
  key?: string;
  type?: string;
  fields?: Record<string, unknown>;
  creators?: { author?: { name?: string; firstName?: string; lastName?: string }[] };
};

export async function parseBibtexText(
  text: string,
  spaceId: string,
): Promise<Citation[]> {
  const parsed = (bibParser as unknown as { parse: (s: string) => { entries: RawEntry[] } }).parse(text);
  const out: Citation[] = [];
  for (const entry of parsed.entries ?? []) {
    if (!entry.key) continue;
    const fields = entry.fields ?? {};
    out.push({
      id: newId(),
      spaceId,
      key: entry.key,
      authors: extractAuthors(entry, fields),
      title: stringField(fields.title) ?? '(untitled)',
      year: numberField(fields.year ?? fields.date) ?? 0,
      type: mapType(entry.type),
      useCount: 0,
      raw: text.slice(0, 10_000),
    });
  }
  return out;
}

export async function parseBibtexFile(
  file: File,
  spaceId: string,
): Promise<Citation[]> {
  const text = await file.text();
  return parseBibtexText(text, spaceId);
}

export async function importCitations(
  citations: Citation[],
): Promise<{ added: number; skipped: number }> {
  let added = 0;
  let skipped = 0;
  await db.transaction('rw', db.citations, async () => {
    for (const c of citations) {
      const existing = await db.citations
        .where('[spaceId+key]')
        .equals([c.spaceId, c.key])
        .first();
      if (existing) {
        skipped += 1;
        continue;
      }
      await db.citations.add(c);
      added += 1;
    }
  });
  return { added, skipped };
}

function stringField(v: unknown): string | undefined {
  if (typeof v === 'string') return v.trim();
  if (Array.isArray(v) && typeof v[0] === 'string') return (v[0] as string).trim();
  return undefined;
}

function numberField(v: unknown): number | undefined {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const m = v.match(/\d{4}/);
    if (m) return parseInt(m[0], 10);
  }
  return undefined;
}

function extractAuthors(entry: RawEntry, fields: Record<string, unknown>): string {
  const creators = entry.creators?.author;
  if (Array.isArray(creators) && creators.length > 0) {
    return creators
      .map((a) => {
        if (!a) return '';
        if (a.name) return a.name;
        return [a.firstName, a.lastName].filter(Boolean).join(' ');
      })
      .filter(Boolean)
      .join(', ');
  }
  return stringField(fields.author) ?? '(unknown)';
}

function mapType(type: string | undefined): Citation['type'] {
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
    default:
      return 'misc';
  }
}

function bibtexTypeFor(c: Citation): string {
  switch (c.type) {
    case 'book':
      return 'book';
    case 'article':
      return 'article';
    case 'chapter':
      return 'incollection';
    default:
      return 'misc';
  }
}

function escapeBraces(s: string): string {
  return s.replace(/[{}]/g, '');
}

export function serializeCitationsToBibtex(citations: Citation[]): string {
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
      fields.push(`  year   = {${c.year}}`);
    }
    parts.push(`@${bibtexTypeFor(c)}{${c.key},\n${fields.join(',\n')}\n}`);
  }
  return parts.join('\n\n') + (parts.length > 0 ? '\n' : '');
}
