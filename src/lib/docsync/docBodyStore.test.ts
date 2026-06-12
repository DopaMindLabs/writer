import { describe, expect, it } from 'vitest';
import {
  FAKE_CORRUPT_BYTE,
  createFakeEngine,
  createFakeUpdateLog,
} from '@/test/docsync/fakes';
import { openDocSyncSession } from './docBodyStore';

const bytes = (...values: number[]) => Uint8Array.from(values);

const makeDeps = () => ({
  engine: createFakeEngine(),
  log: createFakeUpdateLog(),
});

describe('openDocSyncSession', () => {
  it('opens a fresh doc with no stored state', async () => {
    const deps = makeDeps();
    const session = await openDocSyncSession('doc-a', deps);
    expect(session.hasStoredState).toBe(false);
    expect(session.epoch).toBe(0);
    expect(deps.engine.opened).toHaveLength(1);
  });

  it('persists engine updates with the session epoch', async () => {
    const deps = makeDeps();
    await deps.log.invalidate('doc-a'); // epoch 1
    const session = await openDocSyncSession('doc-a', deps);
    deps.engine.opened[0].emit(bytes(1));
    await Promise.resolve(); // let the async append settle
    const state = await deps.log.load('doc-a');
    expect(state.updates.map((u) => u.update)).toEqual([bytes(1)]);
    expect(state.updates[0].epoch).toBe(session.epoch);
  });

  it('compacts multiple stored updates into one snapshot row', async () => {
    const deps = makeDeps();
    await deps.log.append('doc-a', 0, bytes(1));
    await deps.log.append('doc-a', 0, bytes(2));
    const session = await openDocSyncSession('doc-a', deps);
    expect(session.hasStoredState).toBe(true);
    const rows = deps.log.rows('doc-a');
    expect(rows).toHaveLength(1);
    expect(rows[0].update).toEqual(bytes(1, 2));
  });

  it('does not compact a single stored row', async () => {
    const deps = makeDeps();
    await deps.log.append('doc-a', 0, bytes(1));
    await openDocSyncSession('doc-a', deps);
    expect(deps.log.rows('doc-a').map((u) => u.update)).toEqual([bytes(1)]);
  });

  it('falls back to a fresh doc when stored state is corrupt', async () => {
    const deps = makeDeps();
    await deps.log.append('doc-a', 0, bytes(FAKE_CORRUPT_BYTE));
    const session = await openDocSyncSession('doc-a', deps);
    expect(session.hasStoredState).toBe(false);
    expect(session.epoch).toBe(1); // invalidated
    expect(deps.log.rows('doc-a')).toEqual([]);
  });

  it('close stops persisting updates', async () => {
    const deps = makeDeps();
    const session = await openDocSyncSession('doc-a', deps);
    session.close();
    expect(deps.engine.opened[0].destroyed).toBe(true);
    deps.engine.opened[0].emit(bytes(1));
    await Promise.resolve();
    expect(deps.log.rows('doc-a')).toEqual([]);
  });

  it('gives every session a distinct key', async () => {
    const deps = makeDeps();
    const first = await openDocSyncSession('doc-a', deps);
    const second = await openDocSyncSession('doc-a', deps);
    expect(first.key).not.toBe(second.key);
  });
});
