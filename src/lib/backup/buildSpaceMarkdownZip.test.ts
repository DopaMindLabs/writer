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
import { NoteKind, NoteState } from '@/db/schema';
import {
  backupFilename,
  buildSpaceMarkdownZip,
  buildSpaceMarkdownZipFor,
  readSpaceSnapshot,
  slugify,
  yamlFrontmatter,
  type SpaceSnapshot,
} from './buildSpaceMarkdownZip';

const WHEN = Date.UTC(2026, 4, 15, 14, 32);

const loadZip = async (blob: Blob): Promise<JSZip> => {
  const buf = await blob.arrayBuffer();
  return JSZip.loadAsync(buf);
};

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
  it('emits null and empty values without quoting nothing-keys', () => {
    const out = yamlFrontmatter({ explicit: null, n: 0, t: true, f: false });
    expect(out).toContain('explicit: \n');
    expect(out).toContain('n: 0');
    expect(out).toContain('t: true');
    expect(out).toContain('f: false');
  });
  it("emits an empty string as ''", () => {
    expect(yamlFrontmatter({ x: '' })).toContain("x: ''");
  });
  it('quotes strings starting with YAML indicator characters', () => {
    expect(yamlFrontmatter({ x: '- leading dash' })).toContain(
      'x: "- leading dash"',
    );
    expect(yamlFrontmatter({ x: '#hash' })).toContain('x: "#hash"');
  });
  it('quotes bare YAML keywords that would otherwise parse as booleans/numbers', () => {
    expect(yamlFrontmatter({ x: 'true' })).toContain('x: "true"');
    expect(yamlFrontmatter({ x: 'null' })).toContain('x: "null"');
    expect(yamlFrontmatter({ x: '42' })).toContain('x: "42"');
  });
  it('quotes strings with trailing whitespace', () => {
    expect(yamlFrontmatter({ x: 'tail ' })).toContain('x: "tail "');
  });
  it('escapes embedded backslashes and double quotes when forced to quote', () => {
    const out = yamlFrontmatter({ x: 'a: "b" \\ c' });
    expect(out).toContain('x: "a: \\"b\\" \\\\ c"');
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

  it('places docs under just the section slug when the parent section is missing', async () => {
    await db.sections.put({
      id: 'orphan-sub',
      spaceId: 's1',
      parentSectionId: 'missing-parent',
      label: 'Orphan Sub',
      order: 5,
    });
    await db.docs.put({
      ...sampleDoc,
      id: 'd-orphan-sub',
      sectionId: 'orphan-sub',
      name: 'Stranded',
    });
    const { blob } = await buildSpaceMarkdownZipFor(sampleSpace.id, WHEN);
    const zip = await loadZip(blob);
    const path = Object.keys(zip.files).find((p) => p.includes('stranded.md'));
    expect(path).toBeDefined();
    // No `${parentSlug}/` prefix because the parent slug couldn't be resolved.
    expect(path).toBe('manuscript/orphan-sub/01-stranded.md');
  });

  it('disambiguates sibling sections that slugify to the same folder', async () => {
    await db.sections.bulkPut([
      { id: 'dupA', spaceId: 's1', parentSectionId: null, label: 'Drafts', order: 1 },
      { id: 'dupB', spaceId: 's1', parentSectionId: null, label: 'Drafts!', order: 2 },
    ]);
    await db.docs.bulkPut([
      { ...sampleDoc, id: 'docA', sectionId: 'dupA', name: 'A' },
      { ...sampleDoc, id: 'docB', sectionId: 'dupB', name: 'B' },
    ]);
    const { blob } = await buildSpaceMarkdownZipFor(sampleSpace.id, WHEN);
    const zip = await loadZip(blob);
    const folders = Object.keys(zip.files)
      .filter((p) => p.startsWith('manuscript/drafts'))
      .map((p) => p.split('/').slice(0, 2).join('/'));
    const unique = new Set(folders);
    expect(unique.size).toBeGreaterThanOrEqual(2);
    expect([...unique]).toEqual(
      expect.arrayContaining(['manuscript/drafts', 'manuscript/drafts-2']),
    );
  });

  it('writes doc meta.status into frontmatter when present', async () => {
    await db.docs.put({
      ...sampleDoc,
      id: 'd-status',
      name: 'With Status',
      meta: { wordCount: 12, status: 'draft' },
    });
    const { blob } = await buildSpaceMarkdownZipFor(sampleSpace.id, WHEN);
    const zip = await loadZip(blob);
    const path = Object.keys(zip.files).find((p) => p.includes('with-status.md'));
    expect(path).toBeDefined();
    const content = await zip.file(path!)!.async('string');
    expect(content).toContain('status: draft');
    expect(content).toContain('wordCount: 12');
  });

  it('renders notes grouped by kind with title + body fallback paths', async () => {
    await db.notes.bulkPut([
      { ...sampleNote, id: 'n-titled', title: 'Hero arc', body: 'Body line 1\nBody line 2' },
      {
        ...sampleNote,
        id: 'n-untitled',
        title: undefined,
        body: 'Heading line\nDetail line',
      },
      {
        ...sampleNote,
        id: 'n-empty',
        title: '   ',
        body: '',
      },
      {
        ...sampleNote,
        id: 'n-other-kind',
        kind: NoteKind.Question,
        title: 'Why?',
        body: '',
      },
    ]);
    const { blob } = await buildSpaceMarkdownZipFor(sampleSpace.id, WHEN);
    const zip = await loadZip(blob);
    const md = await zip.file('notes.md')!.async('string');
    expect(md).toContain('# Notes');
    expect(md).toContain('## note');
    expect(md).toContain('## question');
    // Titled note: heading is title, indented body lines follow
    expect(md).toContain('- **Hero arc**');
    expect(md).toContain('  Body line 1');
    expect(md).toContain('  Body line 2');
    // Untitled note: heading is first body line, rest indented
    expect(md).toContain('- **Heading line**');
    expect(md).toContain('  Detail line');
    // Whitespace-only title falls back further to the empty-body sentinel
    expect(md).toContain('- **_(empty)_**');
    // 'question' kind appears even with a different kind enum
    expect(md).toContain('- **Why?**');
  });

  it('writes the empty-state placeholders when no notes/citations/connections/annotations/palettes exist', async () => {
    // beforeEach seeds a note; clear it so we hit the empty branches.
    await db.notes.clear();
    const { blob } = await buildSpaceMarkdownZipFor(sampleSpace.id, WHEN);
    const zip = await loadZip(blob);
    expect(await zip.file('notes.md')!.async('string')).toContain('_No notes._');
    expect(await zip.file('citations.md')!.async('string')).toContain('_No citations._');
    expect(await zip.file('connections.md')!.async('string')).toContain(
      '_No connections._',
    );
    expect(await zip.file('annotations.md')!.async('string')).toContain(
      '_No annotations._',
    );
    expect(await zip.file('palette.md')!.async('string')).toContain(
      '_No palette configured._',
    );
  });

  it('renders citations sorted by author and tolerates missing fields', async () => {
    await db.citations.bulkPut([
      {
        id: 'c-z',
        spaceId: 's1',
        key: 'zenith2020',
        authors: 'Zhang, L.',
        title: 'On Zenith',
        year: 2020,
        type: 'article',
        useCount: 1,
      },
      {
        id: 'c-a',
        spaceId: 's1',
        key: 'anonNd',
        authors: '',
        title: '',
        year: 0,
        type: 'misc',
        useCount: 0,
      },
      // Second empty-authors citation: sort callback now sees pairs where
      // BOTH a.authors and b.authors are falsy, covering the remaining
      // `(b.authors || '')` falsy branch in renderCitationsMd.
      {
        id: 'c-a2',
        spaceId: 's1',
        key: 'alsoAnon',
        authors: '',
        title: 'Untitled Two',
        year: 0,
        type: 'misc',
        useCount: 0,
      },
    ]);
    const { blob } = await buildSpaceMarkdownZipFor(sampleSpace.id, WHEN);
    const zip = await loadZip(blob);
    const md = await zip.file('citations.md')!.async('string');
    expect(md).toContain('# Citations');
    expect(md).toContain('(unknown)');
    expect(md).toContain('n.d.');
    expect(md).toContain('(untitled)');
    expect(md).toContain('Zhang, L.');
    // Empty-authors row should sort before "Zhang..."
    const anonIdx = md.indexOf('anonNd');
    const zenithIdx = md.indexOf('zenith2020');
    expect(anonIdx).toBeGreaterThan(-1);
    expect(zenithIdx).toBeGreaterThan(anonIdx);
  });

  it('renders connections with note titles and falls back to note id when unknown', async () => {
    await db.notes.clear();
    await db.notes.bulkPut([
      { ...sampleNote, id: 'src-note', title: 'Source' },
      { ...sampleNote, id: 'dst-note', title: undefined, body: 'Sink heading\nmore' },
      // Empty title AND empty body — labelFor falls through to the note id.
      { ...sampleNote, id: 'empty-note', title: undefined, body: '' },
    ]);
    await db.connections.bulkPut([
      {
        id: 'conn1',
        spaceId: 's1',
        fromNoteId: 'src-note',
        toNoteId: 'dst-note',
        createdAt: FIXED_TIME,
      },
      {
        id: 'conn2',
        spaceId: 's1',
        fromNoteId: 'empty-note',
        toNoteId: 'src-note',
        createdAt: FIXED_TIME,
      },
      {
        id: 'conn3',
        spaceId: 's1',
        fromNoteId: 'ghost-from', // not present in notes
        toNoteId: 'ghost-to', // not present in notes
        createdAt: FIXED_TIME,
      },
    ]);
    const { blob } = await buildSpaceMarkdownZipFor(sampleSpace.id, WHEN);
    const zip = await loadZip(blob);
    const md = await zip.file('connections.md')!.async('string');
    expect(md).toContain('# Connections');
    expect(md).toContain('Source → Sink heading');
    // labelFor entry exists but resolved to the note id (empty title+body)
    expect(md).toContain('empty-note → Source');
    // labelFor map miss on both ends — verbatim ids on both sides
    expect(md).toContain('ghost-from → ghost-to');
  });

  it('renders annotations grouped by doc with color, body, and unknown-doc fallback', async () => {
    await db.docs.put({ ...sampleDoc, id: 'd-anno', name: 'Annotated' });
    await db.annotations.bulkPut([
      {
        id: 'a1',
        docId: 'd-anno',
        rangeStart: 0,
        rangeEnd: 10,
        kind: 'highlight',
        color: 'yellow',
        body: 'multi\nline',
        author: 'alice',
        createdAt: FIXED_TIME,
      },
      {
        id: 'a2',
        docId: 'd-anno',
        rangeStart: 5,
        rangeEnd: 15,
        kind: 'inline',
        author: 'bob',
        createdAt: FIXED_TIME,
      },
    ]);
    const { blob } = await buildSpaceMarkdownZipFor(sampleSpace.id, WHEN);
    const zip = await loadZip(blob);
    const md = await zip.file('annotations.md')!.async('string');
    expect(md).toContain('# Annotations');
    expect(md).toContain('## Annotated');
    expect(md).toContain('**highlight** `0–10` · yellow — alice');
    expect(md).toContain('  > multi line');
    expect(md).toContain('**inline** `5–15` — bob');
  });

  it('renders the highlight palette with numbered slots', async () => {
    await db.palettes.put({
      id: 'p1',
      spaceId: 's1',
      slots: [
        { name: 'Hero', color: '#ffcc00' },
        { name: 'Foil', color: '#33aaff' },
      ],
    });
    const { blob } = await buildSpaceMarkdownZipFor(sampleSpace.id, WHEN);
    const zip = await loadZip(blob);
    const md = await zip.file('palette.md')!.async('string');
    expect(md).toContain('# Palette');
    expect(md).toContain('## `p1`');
    expect(md).toContain('1. Hero — `#ffcc00`');
    expect(md).toContain('2. Foil — `#33aaff`');
  });

  it('falls back to the docId when an annotation targets a doc not in the snapshot', async () => {
    // The DB query in readSpaceSnapshot only collects annotations whose docId
    // matches a known doc, so the `docName.get(docId) ?? docId` fallback in
    // renderAnnotationsMd can't be reached via buildSpaceMarkdownZipFor. Call
    // buildSpaceMarkdownZip directly with a hand-crafted snapshot to cover it.
    const snapshot: SpaceSnapshot = {
      space: sampleSpace,
      sections: [],
      docs: [{ ...sampleDoc, id: 'known', name: 'Known Doc' }],
      notes: [],
      annotations: [
        {
          id: 'a-orphan',
          docId: 'ghost-doc',
          rangeStart: 0,
          rangeEnd: 3,
          kind: 'side',
          author: 'eve',
          createdAt: FIXED_TIME,
        },
      ],
      citations: [],
      connections: [],
      palettes: [],
    };
    const blob = await buildSpaceMarkdownZip(snapshot, WHEN);
    const zip = await loadZip(blob);
    const md = await zip.file('annotations.md')!.async('string');
    expect(md).toContain('## ghost-doc');
    expect(md).toContain('**side** `0–3` — eve');
  });

  it('renders untitled notes whose body collapses to empty', async () => {
    // Forces n.body.split('\n')[0]?.trim() → '' → final '_(empty)_' fallback,
    // separately from the whitespace-title path covered above.
    await db.notes.clear();
    await db.notes.put({
      ...sampleNote,
      id: 'n-blank',
      title: undefined,
      body: '',
      state: NoteState.User,
    });
    const { blob } = await buildSpaceMarkdownZipFor(sampleSpace.id, WHEN);
    const zip = await loadZip(blob);
    const md = await zip.file('notes.md')!.async('string');
    expect(md).toContain('- **_(empty)_**');
  });

  it('renders annotations and palette content when present', async () => {
    await db.annotations.bulkPut([
      {
        id: 'a1',
        docId: sampleDoc.id,
        rangeStart: 0,
        rangeEnd: 10,
        kind: 'highlight',
        color: 'yellow',
        body: 'first\nmulti-line',
        author: 'me',
        createdAt: 0,
      },
      {
        id: 'a2',
        docId: sampleDoc.id,
        rangeStart: 12,
        rangeEnd: 18,
        kind: 'inline',
        author: 'me',
        createdAt: 1,
      },
    ]);
    await db.palettes.put({
      id: 'p1',
      spaceId: sampleSpace.id,
      slots: [
        { name: 'Warm', color: '#ffaa00' },
        { name: 'Cool', color: '#0099ff' },
      ],
    });
    await db.citations.put({
      id: 'c1',
      spaceId: sampleSpace.id,
      key: 'Doe2024',
      authors: 'Doe, J.',
      title: 'A title',
      year: 2024,
      type: 'article',
      useCount: 0,
    });
    await db.connections.put({
      id: 'conn1',
      spaceId: sampleSpace.id,
      fromNoteId: sampleNote.id,
      toNoteId: sampleNote.id,
      createdAt: 0,
    });

    const { blob } = await buildSpaceMarkdownZipFor(sampleSpace.id, WHEN);
    const zip = await loadZip(blob);
    const annotations = await zip.file('annotations.md')!.async('string');
    expect(annotations).toContain('# Annotations');
    expect(annotations).toContain('**highlight**');
    expect(annotations).toContain('yellow');
    expect(annotations).toContain('first multi-line');
    const palette = await zip.file('palette.md')!.async('string');
    expect(palette).toContain('# Palette');
    expect(palette).toContain('Warm');
    expect(palette).toContain('#ffaa00');
    const citations = await zip.file('citations.md')!.async('string');
    expect(citations).toContain('Doe2024');
    const connections = await zip.file('connections.md')!.async('string');
    expect(connections.length).toBeGreaterThan(0);
  });
});
