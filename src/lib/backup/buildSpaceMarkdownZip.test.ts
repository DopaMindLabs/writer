import { describe, it, expect, beforeEach } from 'vitest';
import JSZip from 'jszip';
import { db } from '@/db/db';
import {
  FIXED_TIME,
  sampleSpace,
  sampleSection,
  sampleSubsection,
  sampleDoc,
  sampleNote,
} from '@/test/fixtures';
import {
  backupFilename,
  buildSpaceMarkdownZipFor,
  readSpaceSnapshot,
  slugify,
  yamlFrontmatter,
} from './buildSpaceMarkdownZip';

const WHEN = Date.UTC(2026, 4, 15, 14, 32);

async function loadZip(blob: Blob): Promise<JSZip> {
  const buf = await blob.arrayBuffer();
  return JSZip.loadAsync(buf);
}

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Chapter One!')).toBe('chapter-one');
  });
  it('falls back when empty', () => {
    expect(slugify('___', 'fallback')).toBe('fallback');
  });
});

describe('yamlFrontmatter', () => {
  it('emits a fenced YAML block, skipping undefined values', () => {
    const out = yamlFrontmatter({ name: 'A', tag: 'TST', missing: undefined });
    expect(out).toContain('---\n');
    expect(out).toContain('name: A');
    expect(out).toContain('tag: TST');
    expect(out).not.toContain('missing:');
  });
  it('quotes strings containing reserved characters', () => {
    const out = yamlFrontmatter({ title: 'Hello: world' });
    expect(out).toContain('title: "Hello: world"');
  });
});

describe('backupFilename', () => {
  it('combines slugified name and UTC timestamp', () => {
    expect(backupFilename('Hollowmere', WHEN)).toBe(
      'hollowmere-2026-05-15-1432.zip',
    );
  });
});

describe('readSpaceSnapshot', () => {
  beforeEach(async () => {
    await db.spaces.put(sampleSpace);
    await db.sections.bulkPut([sampleSection, sampleSubsection]);
    await db.docs.put(sampleDoc);
    await db.notes.put(sampleNote);
  });

  it('throws when the space does not exist', async () => {
    await expect(readSpaceSnapshot('nope')).rejects.toThrow(/not found/i);
  });

  it('returns all rows scoped to the space', async () => {
    const snap = await readSpaceSnapshot(sampleSpace.id);
    expect(snap.space.id).toBe('s1');
    expect(snap.sections).toHaveLength(2);
    expect(snap.docs).toHaveLength(1);
    expect(snap.notes).toHaveLength(1);
  });
});

describe('buildSpaceMarkdownZipFor', () => {
  beforeEach(async () => {
    await db.spaces.put(sampleSpace);
    await db.sections.bulkPut([sampleSection, sampleSubsection]);
    await db.docs.put({ ...sampleDoc, name: 'Opening', body: 'Plain seed text.' });
    await db.notes.put(sampleNote);
  });

  it('produces a zip with the expected file layout', async () => {
    const { blob, filename } = await buildSpaceMarkdownZipFor(sampleSpace.id, WHEN);
    expect(blob.size).toBeGreaterThan(0);
    expect(filename).toBe('test-space-2026-05-15-1432.zip');

    const zip = await loadZip(blob);
    const paths = Object.keys(zip.files);
    expect(paths).toContain('space.md');
    expect(paths).toContain('notes.md');
    expect(paths).toContain('citations.md');
    expect(paths).toContain('connections.md');
    expect(paths).toContain('annotations.md');
    expect(paths).toContain('palette.md');
    const docPath = paths.find(
      (p) => p.startsWith('manuscript/drafts/') && p.endsWith('.md'),
    );
    expect(docPath).toBeDefined();
  });

  it('embeds the space frontmatter in space.md', async () => {
    const { blob } = await buildSpaceMarkdownZipFor(sampleSpace.id, WHEN);
    const zip = await loadZip(blob);
    const content = await zip.file('space.md')!.async('string');
    expect(content).toContain('name: Test Space');
    expect(content).toContain('tag: TST');
    expect(content).toContain('format: md-zip');
    expect(content).toContain('exportedAt: 2026-05-15T14:32:00.000Z');
  });

  it('writes the doc body as plain markdown when input is plain text', async () => {
    const { blob } = await buildSpaceMarkdownZipFor(sampleSpace.id, WHEN);
    const zip = await loadZip(blob);
    const docFile = Object.keys(zip.files).find(
      (p) => p.startsWith('manuscript/drafts/') && p.endsWith('.md'),
    );
    expect(docFile).toBeDefined();
    const content = await zip.file(docFile!)!.async('string');
    expect(content).toContain('name: Opening');
    expect(content).toContain('Plain seed text.');
  });

  it('renders Lexical-JSON doc bodies as markdown', async () => {
    const lexical = JSON.stringify({
      root: {
        children: [
          {
            children: [
              {
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text: 'Hello',
                type: 'text',
                version: 1,
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            type: 'heading',
            version: 1,
            tag: 'h2',
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'root',
        version: 1,
      },
    });
    await db.docs.put({
      ...sampleDoc,
      id: 'd-lex',
      name: 'Lexical Doc',
      body: lexical,
      updatedAt: FIXED_TIME,
    });
    const { blob } = await buildSpaceMarkdownZipFor(sampleSpace.id, WHEN);
    const zip = await loadZip(blob);
    const lexFile = Object.keys(zip.files).find((p) =>
      p.includes('lexical-doc.md'),
    );
    expect(lexFile).toBeDefined();
    const content = await zip.file(lexFile!)!.async('string');
    expect(content).toContain('## Hello');
  });

  it('places orphan docs (unknown sectionId) under manuscript/_unsorted/', async () => {
    await db.docs.put({
      ...sampleDoc,
      id: 'd-orphan',
      sectionId: 'ghost',
      name: 'Floater',
    });
    const { blob } = await buildSpaceMarkdownZipFor(sampleSpace.id, WHEN);
    const zip = await loadZip(blob);
    const orphan = Object.keys(zip.files).find((p) =>
      p.startsWith('manuscript/_unsorted/'),
    );
    expect(orphan).toBeDefined();
  });
});
