import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/db/db';
import { appLogger } from '@/lib/appLogger';
import { registerEditorHandle } from '@/lib/collab/editorRegistry';
import { writeDocBodyBaseline } from '@/lib/docs';
import {
  addDocWithoutCrdt,
  canon,
  crdtSnapshot,
  seedLocalDoc,
} from '@/test/reconcileFixtures';
import { refreshInboundDocs } from './inboundDocRefresh';

/**
 * What a document that just arrived from a paired device has to do to become
 * visible.
 *
 * The row landing is not enough: the editor renders from a CRDT log that no
 * frame ever touches, so an open document would sit there showing the old text
 * until someone navigated away and back.
 */

/** Listen for reload announcements the way another tab's editor would. */
const watchReloads = (): { seen: string[][]; stop: () => void } => {
  const seen: string[][] = [];
  const channel = new BroadcastChannel('lipsum-doc-reload');
  channel.onmessage = (event: MessageEvent<unknown>) => {
    if (Array.isArray(event.data)) seen.push(event.data as string[]);
  };
  return {
    seen,
    stop: () => {
      channel.close();
    },
  };
};

/** BroadcastChannel delivers on a later task; give it one to arrive in. */
const settle = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 30));

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('refreshInboundDocs', () => {
  it('pushes the arrived body through an editor that has the document open', async () => {
    await seedLocalDoc('d1', canon('what this device had'));
    await writeDocBodyBaseline('d1', canon('what this device had'));
    await db.docs.update('d1', { body: canon('what the peer wrote') });
    const restored: string[] = [];
    const unregister = registerEditorHandle('d1', {
      restoreBody: (serialized) => {
        restored.push(serialized);
        return Promise.resolve();
      },
    });
    const reloads = watchReloads();

    await refreshInboundDocs({ db, docIds: ['d1'] });
    await settle();

    expect(restored).toEqual([canon('what the peer wrote')]);
    // Nothing to announce: the live editor's own binding carries the change to
    // every other tab, and remounting them would throw away their editors.
    expect(reloads.seen).toEqual([]);
    reloads.stop();
    unregister();
  });

  it('reseeds documents no editor holds, and tells other tabs once', async () => {
    for (const id of ['d1', 'd2']) {
      await seedLocalDoc(id, canon(`what this device had in ${id}`));
      await writeDocBodyBaseline(id, canon(`what this device had in ${id}`));
      await db.docs.update(id, { body: canon(`what the peer wrote in ${id}`) });
    }
    const reloads = watchReloads();

    await refreshInboundDocs({ db, docIds: ['d1', 'd2'] });
    await settle();

    expect(await crdtSnapshot('d1')).toBe(canon('what the peer wrote in d1'));
    expect(await crdtSnapshot('d2')).toBe(canon('what the peer wrote in d2'));
    // One announcement for the pair, not one apiece.
    expect(reloads.seen).toEqual([['d1', 'd2']]);
    reloads.stop();
  });

  it('says nothing about a document that was already up to date', async () => {
    await seedLocalDoc('d1', canon('the same on both devices'));
    const reloads = watchReloads();

    await refreshInboundDocs({ db, docIds: ['d1'] });
    await settle();

    // A frame that changed nothing must not remount every other tab's editor.
    expect(reloads.seen).toEqual([]);
    reloads.stop();
  });

  it('passes over a document whose row has since gone', async () => {
    const reloads = watchReloads();

    await expect(
      refreshInboundDocs({ db, docIds: ['deleted-between-the-two'] }),
    ).resolves.toBeUndefined();
    await settle();

    expect(reloads.seen).toEqual([]);
    reloads.stop();
  });

  it('reports a document it could not refresh and still refreshes the rest', async () => {
    await addDocWithoutCrdt('d1', canon('the peer wrote this'));
    await seedLocalDoc('d2', canon('what this device had'));
    await writeDocBodyBaseline('d2', canon('what this device had'));
    await db.docs.update('d2', { body: canon('the peer wrote this too') });
    const unregister = registerEditorHandle('d1', {
      restoreBody: () => Promise.reject(new Error('the editor went away')),
    });
    const warn = vi.spyOn(appLogger, 'warn').mockImplementation(() => undefined);
    const reloads = watchReloads();

    await refreshInboundDocs({ db, docIds: ['d1', 'd2'] });
    await settle();

    expect(warn).toHaveBeenCalledTimes(1);
    // One document failing is one document, not the whole sweep.
    expect(await crdtSnapshot('d2')).toBe(canon('the peer wrote this too'));
    expect(reloads.seen).toEqual([['d2']]);
    reloads.stop();
    unregister();
    warn.mockRestore();
  });
});
