import { describe, expect, it, vi } from 'vitest';
import { InvariantError } from '@/lib/invariant';
import type {
  AccessControlAdapter,
  SyncProvider,
  SyncProviderBinding,
} from './types';
import { createSyncCoordinator } from './coordinator';

const accessControl = (
  resolveBinding: AccessControlAdapter['resolveBinding'],
): AccessControlAdapter => ({
  createScope: () => Promise.resolve(),
  dropScope: () => Promise.resolve(),
  listMembers: () => Promise.resolve([]),
  addMember: () => Promise.resolve(),
  removeMember: () => Promise.resolve(),
  setMemberRole: () => Promise.resolve(),
  resolveBinding,
});

const binding = (providerId: string): SyncProviderBinding => ({
  scopeId: 'space-1',
  providerId,
  externalScopeId: `${providerId}-realm`,
  enabled: true,
});

const frameSyncOnly = (id: string): SyncProvider => ({
  id,
  frameSync: {
    start: () => Promise.resolve(() => undefined),
    requestSync: () => Promise.resolve(),
    status: { subscribe: () => ({ unsubscribe: () => undefined }) },
    syncComplete: { subscribe: () => ({ unsubscribe: () => undefined }) },
  },
});

describe('createSyncCoordinator', () => {
  it('registers providers in order', () => {
    const coordinator = createSyncCoordinator({
      providers: [frameSyncOnly('a'), frameSyncOnly('b')],
    });

    expect(coordinator.providers().map((provider) => provider.id)).toEqual(['a', 'b']);
  });

  it('resolves a provider by id, and nothing for an unknown id', () => {
    const dexie = frameSyncOnly('dexie-cloud');
    const coordinator = createSyncCoordinator({ providers: [dexie] });

    expect(coordinator.provider('dexie-cloud')).toBe(dexie);
    expect(coordinator.provider('webrtc')).toBeUndefined();
  });

  it('rejects duplicate provider ids', () => {
    expect(() =>
      createSyncCoordinator({ providers: [frameSyncOnly('dupe'), frameSyncOnly('dupe')] }),
    ).toThrow(InvariantError);
  });

  it('ignores later mutation of the caller’s provider array', () => {
    const providers = [frameSyncOnly('a')];
    const coordinator = createSyncCoordinator({ providers });

    providers.push(frameSyncOnly('b'));

    expect(coordinator.providers().map((provider) => provider.id)).toEqual(['a']);
    expect(coordinator.provider('b')).toBeUndefined();
  });

  it('does not expose its registry for mutation', () => {
    const coordinator = createSyncCoordinator({ providers: [frameSyncOnly('a')] });

    coordinator.providers().push(frameSyncOnly('b'));

    expect(coordinator.providers()).toHaveLength(1);
  });

  it('lists every provider offering a capability', () => {
    const coordinator = createSyncCoordinator({
      providers: [
        frameSyncOnly('a'),
        { id: 'b', accessControl: accessControl(() => Promise.resolve(undefined)) },
        frameSyncOnly('c'),
      ],
    });

    expect(coordinator.providersWith('frameSync').map((provider) => provider.id)).toEqual([
      'a',
      'c',
    ]);
    expect(coordinator.providersWith('accessControl').map((provider) => provider.id)).toEqual([
      'b',
    ]);
    expect(coordinator.providersWith('realtime')).toEqual([]);
  });

  it('resolves a binding from the first access-control provider that claims the scope', async () => {
    const first = vi.fn(() => Promise.resolve(undefined));
    const second = vi.fn(() => Promise.resolve(binding('second')));
    const coordinator = createSyncCoordinator({
      providers: [
        frameSyncOnly('no-access-control'),
        { id: 'first', accessControl: accessControl(first) },
        { id: 'second', accessControl: accessControl(second) },
      ],
    });

    const resolved = await coordinator.resolveBinding('space-1');

    expect(resolved?.providerId).toBe('second');
    expect(first).toHaveBeenCalledWith('space-1');
  });

  it('stops at the first claiming provider', async () => {
    const later = vi.fn(() => Promise.resolve(binding('later')));
    const coordinator = createSyncCoordinator({
      providers: [
        { id: 'first', accessControl: accessControl(() => Promise.resolve(binding('first'))) },
        { id: 'later', accessControl: accessControl(later) },
      ],
    });

    const resolved = await coordinator.resolveBinding('space-1');

    expect(resolved?.providerId).toBe('first');
    expect(later).not.toHaveBeenCalled();
  });

  it('resolves nothing for a scope no provider claims', async () => {
    const coordinator = createSyncCoordinator({
      providers: [{ id: 'a', accessControl: accessControl(() => Promise.resolve(undefined)) }],
    });

    await expect(coordinator.resolveBinding('space-1')).resolves.toBeUndefined();
  });

  it('resolves nothing when no provider does access control at all', async () => {
    const coordinator = createSyncCoordinator({ providers: [frameSyncOnly('a')] });

    await expect(coordinator.resolveBinding('space-1')).resolves.toBeUndefined();
  });

  it('supports an empty provider list', () => {
    const coordinator = createSyncCoordinator({ providers: [] });

    expect(coordinator.providers()).toEqual([]);
    expect(coordinator.provider('anything')).toBeUndefined();
    expect(coordinator.providersWith('frameSync')).toEqual([]);
  });
});
