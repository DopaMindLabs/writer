import { describe, it, expect, beforeEach } from 'vitest';
import * as Y from 'yjs';
import { createHeadlessEditor } from '@lexical/headless';
import { $getRoot, $createParagraphNode, $createTextNode } from 'lexical';
import { db } from '@/db/db';
import type { Share } from '@/db/schema';
import { EDITOR_NODES } from '@/editor/nodes';
import { seedFromLexicalJson } from './yjs/seed';
import {
  isRoomSeeder,
  roomSeedRole,
  shouldSeedDoc,
  preserveLocalBodyForJoiner,
} from './seedGuard';

const makeShare = (over: Partial<Share> = {}): Share => ({
  docId: 'doc',
  roomId: 'room',
  relayUrl: 'wss://relay',
  role: 'writer',
  contentEpoch: 1,
  seededBy: 'creator',
  seededAt: 1,
  rosterVersion: 1,
  createdAt: 1,
  ...over,
});

const buildBody = (paragraphs: readonly string[]): string => {
  const editor = createHeadlessEditor({
    namespace: 'lorem-editor',
    nodes: EDITOR_NODES,
    onError: (error) => {
      throw error;
    },
  });
  editor.update(
    () => {
      const root = $getRoot();
      root.clear();
      for (const paragraph of paragraphs) {
        root.append($createParagraphNode().append($createTextNode(paragraph)));
      }
    },
    { discrete: true },
  );
  return JSON.stringify(editor.getEditorState().toJSON());
};

const rootXml = (ydoc: Y.Doc): string => (ydoc.get('root', Y.XmlText) as Y.XmlText).toString();
const rootText = (ydoc: Y.Doc): string => rootXml(ydoc).replace(/<[^>]*>/g, '');

const occurrences = (haystack: string, needle: string): number => haystack.split(needle).length - 1;

describe('seedGuard', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('makes the creator the sole seeder at share time', () => {
    const share = makeShare({ seededBy: 'creator' });
    expect(isRoomSeeder(share, 'creator')).toBe(true);
    expect(roomSeedRole(share, 'creator')).toBe('seeder');
    expect(shouldSeedDoc(share, 'creator')).toBe(true);
    // No other device seeds the same room — so the room is seeded exactly once.
    expect(shouldSeedDoc(share, 'someone-else')).toBe(false);
  });

  it('does not seed on a device with a shares row but empty local log', () => {
    const share = makeShare({ seededBy: 'creator' });
    // A restored second device: empty local log, but the share says seeded elsewhere.
    expect(shouldSeedDoc(share, 'restored-device')).toBe(false);
    expect(roomSeedRole(share, 'restored-device')).toBe('joiner');
  });

  it("preserves a joiner's pre-existing body as a baseline revision", async () => {
    const body = buildBody(['My earlier draft.']);
    await preserveLocalBodyForJoiner('doc-1', body);
    const revisions = await db.revisions.where('docId').equals('doc-1').toArray();
    expect(revisions).toHaveLength(1);
    expect(revisions[0].kind).toBe('baseline');
    expect(revisions[0].text).toContain('My earlier draft.');
  });

  it('captures no revision when the joiner has no local body', async () => {
    await preserveLocalBodyForJoiner('doc-2', null);
    expect(await db.revisions.where('docId').equals('doc-2').count()).toBe(0);
  });

  it('non-regression: identical bodies on two devices yield content exactly once', () => {
    const body = buildBody(['Only once.']);
    const seed = seedFromLexicalJson('doc', body);

    // The creator seeds; the joiner (guard says do not seed) converges via sync.
    const share = makeShare({ seededBy: 'creator' });
    expect(shouldSeedDoc(share, 'joiner')).toBe(false);
    const joinerDoc = new Y.Doc();
    Y.applyUpdate(joinerDoc, seed, 'sync');
    expect(occurrences(rootText(joinerDoc), 'Only once.')).toBe(1);

    // Contrast: had the joiner also seeded its identical local body, the two
    // independent insertions would merge into duplicated content.
    const naive = new Y.Doc();
    Y.applyUpdate(naive, seedFromLexicalJson('doc', body), 'own-seed');
    Y.applyUpdate(naive, seed, 'sync');
    expect(occurrences(rootText(naive), 'Only once.')).toBe(2);
  });
});
