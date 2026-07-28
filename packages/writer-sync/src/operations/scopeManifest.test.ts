import { describe, expect, it } from 'vitest';
import { asDeviceId, asOperationId } from '../core/ids';
import type { EncryptedSyncFrame } from './operation.types';
import {
  buildScopeManifests,
  framesForRequest,
  planCatchUp,
  type ScopeManifest,
} from './scopeManifest';

const frameOf = (options: {
  id: string;
  millis: number;
  device?: string;
  scope?: string;
}): EncryptedSyncFrame => ({
  v: 1,
  operationId: asOperationId(options.id),
  accessScopeId: options.scope ?? 'scope-1',
  entityTable: 'notes',
  entityId: `entity-${options.id}`,
  kind: 'put',
  deviceId: asDeviceId(options.device ?? 'device-a'),
  logicalAt: { millis: options.millis, counter: 0 },
  keyId: 'key-1',
  epoch: 1,
  payloadHash: 'hash',
  payload: 'cGF5bG9hZA',
  signature: '',
});

const ALL_SCOPES = ['scope-1', 'scope-2'];

/** A device holding the account key can read any scope it is offered. */
const readsAnyScope = () => true;
/** A device whose key material really is per scope reads only what it has. */
const readsListedScopes = (accessScopeId: string) => ALL_SCOPES.includes(accessScopeId);

describe('buildScopeManifests', () => {
  it('summarises each origin within each scope', () => {
    const manifests = buildScopeManifests([
      frameOf({ id: 'op-a1', millis: 10 }),
      frameOf({ id: 'op-a2', millis: 20 }),
      frameOf({ id: 'op-b1', millis: 15, device: 'device-b' }),
      frameOf({ id: 'op-s2', millis: 30, scope: 'scope-2' }),
    ]);

    expect(manifests).toEqual([
      {
        accessScopeId: 'scope-1',
        origins: [
          {
            originDeviceId: 'device-a',
            highWaterMark: 'op-a2',
            logicalAt: { millis: 20, counter: 0 },
            count: 2,
          },
          {
            originDeviceId: 'device-b',
            highWaterMark: 'op-b1',
            logicalAt: { millis: 15, counter: 0 },
            count: 1,
          },
        ],
      },
      {
        accessScopeId: 'scope-2',
        origins: [
          {
            originDeviceId: 'device-a',
            highWaterMark: 'op-s2',
            logicalAt: { millis: 30, counter: 0 },
            count: 1,
          },
        ],
      },
    ]);
  });

  it('takes the convergence winner as the mark, not the last frame seen', () => {
    const manifests = buildScopeManifests([
      frameOf({ id: 'op-late', millis: 50 }),
      frameOf({ id: 'op-early', millis: 10 }),
    ]);

    expect(manifests[0]?.origins[0]?.highWaterMark).toBe('op-late');
  });

  it('summarises an empty journal as nothing', () => {
    expect(buildScopeManifests([])).toEqual([]);
  });
});

describe('planCatchUp', () => {
  const manifest = (options: {
    scope?: string;
    device?: string;
    mark: string;
    millis: number;
    count?: number;
  }): ScopeManifest => ({
    accessScopeId: options.scope ?? 'scope-1',
    origins: [
      {
        originDeviceId: asDeviceId(options.device ?? 'device-a'),
        highWaterMark: asOperationId(options.mark),
        logicalAt: { millis: options.millis, counter: 0 },
        count: options.count ?? 1,
      },
    ],
  });

  it('requests everything from an origin it has never seen', () => {
    const plan = planCatchUp({
      local: [],
      remote: [manifest({ mark: 'op-a1', millis: 10 })],
      canAccessScope: readsAnyScope,
    });

    expect(plan).toEqual([
      { accessScopeId: 'scope-1', originDeviceId: 'device-a', after: undefined },
    ]);
  });

  it('requests only what follows its own mark', () => {
    const plan = planCatchUp({
      local: [manifest({ mark: 'op-a1', millis: 10 })],
      remote: [manifest({ mark: 'op-a2', millis: 20, count: 2 })],
      canAccessScope: readsAnyScope,
    });

    expect(plan).toEqual([
      {
        accessScopeId: 'scope-1',
        originDeviceId: 'device-a',
        after: { millis: 10, counter: 0 },
      },
    ]);
  });

  it('asks for nothing when it is level with the peer', () => {
    const local = [manifest({ mark: 'op-a1', millis: 10 })];

    expect(
      planCatchUp({ local, remote: local, canAccessScope: readsAnyScope }),
    ).toEqual([]);
  });

  it('asks for nothing when it is ahead of the peer', () => {
    const plan = planCatchUp({
      local: [manifest({ mark: 'op-a2', millis: 20, count: 2 })],
      remote: [manifest({ mark: 'op-a1', millis: 10 })],
      canAccessScope: readsAnyScope,
    });

    expect(plan).toEqual([]);
  });

  it('re-requests the whole origin when the peer holds more below the same mark', () => {
    const plan = planCatchUp({
      local: [manifest({ mark: 'op-a2', millis: 20, count: 1 })],
      remote: [manifest({ mark: 'op-a2', millis: 20, count: 4 })],
      canAccessScope: readsAnyScope,
    });

    expect(plan).toEqual([
      { accessScopeId: 'scope-1', originDeviceId: 'device-a', after: undefined },
    ]);
  });

  it('never requests a scope it cannot decrypt', () => {
    const plan = planCatchUp({
      local: [],
      remote: [manifest({ scope: 'scope-9', mark: 'op-x', millis: 10 })],
      canAccessScope: readsListedScopes,
    });

    expect(plan).toEqual([]);
  });

  it('requests a scope it holds nothing in at all', () => {
    // A device that has just been paired holds nothing. Deciding what it may
    // ask for from what it already has would leave it asking for nothing.
    const plan = planCatchUp({
      local: [manifest({ mark: 'op-a1', millis: 10 })],
      remote: [manifest({ scope: 'scope-2', mark: 'op-s1', millis: 10 })],
      canAccessScope: readsAnyScope,
    });

    expect(plan).toEqual([
      { accessScopeId: 'scope-2', originDeviceId: 'device-a', after: undefined },
    ]);
  });
});

describe('framesForRequest', () => {
  const frames = [
    frameOf({ id: 'op-a1', millis: 10 }),
    frameOf({ id: 'op-a2', millis: 20 }),
    frameOf({ id: 'op-b1', millis: 30, device: 'device-b' }),
    frameOf({ id: 'op-s2', millis: 40, scope: 'scope-2' }),
  ];

  it('answers with one origin’s frames after the requested point', () => {
    const answer = framesForRequest(frames, {
      accessScopeId: 'scope-1',
      originDeviceId: asDeviceId('device-a'),
      after: { millis: 10, counter: 0 },
    });

    expect(answer.map((frame) => String(frame.operationId))).toEqual(['op-a2']);
  });

  it('answers with the whole origin when no point is given', () => {
    const answer = framesForRequest(frames, {
      accessScopeId: 'scope-1',
      originDeviceId: asDeviceId('device-a'),
    });

    expect(answer.map((frame) => String(frame.operationId))).toEqual(['op-a1', 'op-a2']);
  });

  it('answers in convergence order however the journal is arranged', () => {
    const answer = framesForRequest(
      [frameOf({ id: 'op-late', millis: 90 }), frameOf({ id: 'op-early', millis: 5 })],
      { accessScopeId: 'scope-1', originDeviceId: asDeviceId('device-a') },
    );

    expect(answer.map((frame) => String(frame.operationId))).toEqual([
      'op-early',
      'op-late',
    ]);
  });

  it('never leaks another scope or another origin', () => {
    const answer = framesForRequest(frames, {
      accessScopeId: 'scope-1',
      originDeviceId: asDeviceId('device-b'),
    });

    expect(answer.map((frame) => String(frame.operationId))).toEqual(['op-b1']);
  });
});
