import { describe, it, expect } from 'vitest';
import type { SyncProvider, AccessScopeId, SyncProviderId } from './types';
import { createSyncCoordinator } from './coordinator';

const toAccessScopeId = (s: string): AccessScopeId => s as AccessScopeId;

describe('SyncCoordinator', () => {
  it('lists registered providers', () => {
    const provider1: SyncProvider = { id: 'test-1' as SyncProviderId };
    const provider2: SyncProvider = { id: 'test-2' as SyncProviderId };
    const coordinator = createSyncCoordinator({ providers: [provider1, provider2] });

    expect(coordinator.listProviders()).toHaveLength(2);
    expect(coordinator.listProviders().map((p) => p.id)).toContain('test-1');
  });

  it('resolves provider by id', () => {
    const provider: SyncProvider = { id: 'test-provider' as SyncProviderId };
    const coordinator = createSyncCoordinator({ providers: [provider] });

    const resolved = coordinator.resolveProvider('test-provider' as SyncProviderId);
    expect(resolved).toBe(provider);
  });

  it('returns undefined for unknown provider id', () => {
    const coordinator = createSyncCoordinator({ providers: [] });
    const resolved = coordinator.resolveProvider('unknown' as SyncProviderId);
    expect(resolved).toBeUndefined();
  });

  it('finds first provider with capability', () => {
    const noFrameSync: SyncProvider = { id: 'no-frame' as SyncProviderId };
    const withFrameSync: SyncProvider = {
      id: 'with-frame' as SyncProviderId,
      frameSync: {
        start: () => Promise.resolve(() => {}),
        stop: () => Promise.resolve(),
        requestSync: () => Promise.resolve(),
        syncState: () => ({ phase: 'synced' }),
        onSyncComplete: () => () => {},
      },
    };
    const coordinator = createSyncCoordinator({ providers: [noFrameSync, withFrameSync] });

    const found = coordinator.findProviderWithCapability('frameSync');
    expect(found?.id).toBe('with-frame');
  });

  it('returns undefined when no provider has capability', () => {
    const provider: SyncProvider = { id: 'test' as SyncProviderId };
    const coordinator = createSyncCoordinator({ providers: [provider] });

    const found = coordinator.findProviderWithCapability('frameSync');
    expect(found).toBeUndefined();
  });

  it('rejects duplicate provider ids via invariant', () => {
    const provider1: SyncProvider = { id: 'duplicate' as SyncProviderId };
    const provider2: SyncProvider = { id: 'duplicate' as SyncProviderId };

    expect(() => {
      createSyncCoordinator({ providers: [provider1, provider2] });
    }).toThrow();
  });

  it('resolves binding from first provider with accessControl', async () => {
    const noAccessControl: SyncProvider = { id: 'no-ac' as SyncProviderId };
    const withAccessControl: SyncProvider = {
      id: 'with-ac' as SyncProviderId,
      accessControl: {
        createScope: () => Promise.resolve(),
        dropScope: () => Promise.resolve(),
        addMember: () => Promise.resolve(),
        removeMember: () => Promise.resolve(),
        setMemberRole: () => Promise.resolve(),
        listMembers: () => Promise.resolve([]),
        resolveBinding: () =>
          Promise.resolve({
            scopeId: toAccessScopeId('space-1'),
            providerId: 'with-ac' as SyncProviderId,
            enabled: true,
          }),
      },
    };
    const coordinator = createSyncCoordinator({
      providers: [noAccessControl, withAccessControl],
    });

    const binding = await coordinator.resolveBinding(toAccessScopeId('space-1'));
    expect(binding?.providerId).toBe('with-ac');
  });

  it('returns undefined for scope with no binding', async () => {
    const provider: SyncProvider = {
      id: 'test' as SyncProviderId,
      accessControl: {
        createScope: () => Promise.resolve(),
        dropScope: () => Promise.resolve(),
        addMember: () => Promise.resolve(),
        removeMember: () => Promise.resolve(),
        setMemberRole: () => Promise.resolve(),
        listMembers: () => Promise.resolve([]),
        resolveBinding: () => Promise.resolve(undefined),
      },
    };
    const coordinator = createSyncCoordinator({ providers: [provider] });

    const binding = await coordinator.resolveBinding(toAccessScopeId('space-1'));
    expect(binding).toBeUndefined();
  });

  it('handles empty provider list', () => {
    const coordinator = createSyncCoordinator({ providers: [] });

    expect(coordinator.listProviders()).toHaveLength(0);
    expect(coordinator.resolveProvider('any' as SyncProviderId)).toBeUndefined();
    expect(coordinator.findProviderWithCapability('frameSync')).toBeUndefined();
  });
});
