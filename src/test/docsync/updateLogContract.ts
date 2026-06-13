import { describe, expect, it } from 'vitest';
import type { UpdateLog } from '@/lib/docsync/ports';

const bytes = (...values: number[]) => Uint8Array.from(values);

/**
 * Behavioural contract every `UpdateLog` adapter must satisfy. Run against
 * both the in-memory fake and the Dexie adapter so store-level tests built on
 * the fake stay honest.
 */
export const describeUpdateLogContract = (
  makeLog: () => UpdateLog | Promise<UpdateLog>,
) => {
  describe('UpdateLog contract', () => {
    it('returns epoch 0 and no updates for an unseen doc', async () => {
      const log = await makeLog();
      const state = await log.load('doc-a');
      expect(state.epoch).toBe(0);
      expect(state.updates).toEqual([]);
    });

    it('round-trips appended updates in order', async () => {
      const log = await makeLog();
      await log.append('doc-a', 0, bytes(1));
      await log.append('doc-a', 0, bytes(2));
      await log.append('doc-b', 0, bytes(9));
      const state = await log.load('doc-a');
      expect(state.updates.map((u) => u.update)).toEqual([bytes(1), bytes(2)]);
    });

    it('invalidate bumps the epoch and clears stored updates', async () => {
      const log = await makeLog();
      await log.append('doc-a', 0, bytes(1));
      await log.invalidate('doc-a');
      const state = await log.load('doc-a');
      expect(state.epoch).toBe(1);
      expect(state.updates).toEqual([]);
    });

    it('discards updates appended by a stale-epoch writer', async () => {
      const log = await makeLog();
      await log.append('doc-a', 0, bytes(1));
      await log.invalidate('doc-a');
      // A still-running session from before the invalidate appends late.
      await log.append('doc-a', 0, bytes(2));
      await log.append('doc-a', 1, bytes(3));
      const state = await log.load('doc-a');
      expect(state.epoch).toBe(1);
      expect(state.updates.map((u) => u.update)).toEqual([bytes(3)]);
    });

    it('compact replaces exactly the listed updates', async () => {
      const log = await makeLog();
      await log.append('doc-a', 0, bytes(1));
      await log.append('doc-a', 0, bytes(2));
      const loaded = await log.load('doc-a');
      // An update from a concurrent session lands between load and compact.
      await log.append('doc-a', 0, bytes(3));
      await log.compact('doc-a', {
        epoch: 0,
        snapshot: bytes(1, 2),
        replaces: loaded.updates.map((u) => u.id),
      });
      const state = await log.load('doc-a');
      expect(state.updates.map((u) => u.update)).toEqual([
        bytes(3),
        bytes(1, 2),
      ]);
    });

    it('deleteAll removes updates for the given docs only', async () => {
      const log = await makeLog();
      await log.append('doc-a', 0, bytes(1));
      await log.append('doc-b', 0, bytes(2));
      await log.deleteAll(['doc-a']);
      expect((await log.load('doc-a')).updates).toEqual([]);
      expect((await log.load('doc-b')).updates.map((u) => u.update)).toEqual([
        bytes(2),
      ]);
    });
  });
};
