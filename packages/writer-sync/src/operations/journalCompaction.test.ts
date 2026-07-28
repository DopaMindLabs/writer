import { describe, expect, it } from 'vitest';
import { asDeviceId, asOperationId } from '../core/ids';
import type { EncryptedSyncFrame, SyncTombstone } from './operation.types';
import { MILLIS_PER_DAY } from './journalRetention';
import {
  compactableOperationIds,
  releasableTombstones,
  type PeerAcknowledgement,
} from './journalCompaction';

const NOW = 1_700_000_000_000;
const RETENTION = { retentionDays: 30, now: NOW };

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

const peer = (options: {
  id: string;
  scope?: string;
  acknowledged?: Record<string, string>;
}): PeerAcknowledgement => ({
  deviceId: asDeviceId(options.id),
  acknowledgedOperations: options.acknowledged
    ? {
        [options.scope ?? 'scope-1']: Object.fromEntries(
          Object.entries(options.acknowledged).map(([origin, operationId]) => [
            origin,
            asOperationId(operationId),
          ]),
        ),
      }
    : {},
});

const tombstoneOf = (acknowledgedBy: string[]): SyncTombstone => ({
  entityId: 'entity-1',
  entityTable: 'notes',
  accessScopeId: 'scope-1',
  operationId: asOperationId('op-delete'),
  deviceId: asDeviceId('device-a'),
  logicalAt: { millis: NOW - MILLIS_PER_DAY, counter: 0 },
  acknowledgedBy,
});

describe('compactableOperationIds', () => {
  it('compacts a frame every trusted peer already holds, inside the window', () => {
    const frames = [frameOf({ id: 'op-1', millis: NOW - MILLIS_PER_DAY })];
    const peers = [peer({ id: 'device-b', acknowledged: { 'device-a': 'op-1' } })];

    const compactable = compactableOperationIds(frames, { retention: RETENTION, peers });

    expect(compactable.map(String)).toEqual(['op-1']);
  });

  it('spares a frame one trusted peer has not acknowledged', () => {
    const frames = [frameOf({ id: 'op-1', millis: NOW - MILLIS_PER_DAY })];
    const peers = [
      peer({ id: 'device-b', acknowledged: { 'device-a': 'op-1' } }),
      peer({ id: 'device-c' }),
    ];

    expect(
      compactableOperationIds(frames, { retention: RETENTION, peers }),
    ).toEqual([]);
  });

  it('compacts an unacknowledged frame once the window has elapsed', () => {
    const frames = [frameOf({ id: 'op-old', millis: NOW - 31 * MILLIS_PER_DAY })];
    const peers = [peer({ id: 'device-b' })];

    const compactable = compactableOperationIds(frames, { retention: RETENTION, peers });

    expect(compactable.map(String)).toEqual(['op-old']);
  });

  it('falls back to the window alone when no peer is trusted', () => {
    const frames = [
      frameOf({ id: 'op-fresh', millis: NOW - MILLIS_PER_DAY }),
      frameOf({ id: 'op-old', millis: NOW - 31 * MILLIS_PER_DAY }),
    ];

    const compactable = compactableOperationIds(frames, {
      retention: RETENTION,
      peers: [],
    });

    expect(compactable.map(String)).toEqual(['op-old']);
  });

  it('covers earlier operations from the same origin device', () => {
    const frames = [
      frameOf({ id: 'op-1', millis: NOW - 3 * MILLIS_PER_DAY }),
      frameOf({ id: 'op-2', millis: NOW - 2 * MILLIS_PER_DAY }),
      frameOf({ id: 'op-3', millis: NOW - MILLIS_PER_DAY }),
    ];
    const peers = [peer({ id: 'device-b', acknowledged: { 'device-a': 'op-2' } })];

    const compactable = compactableOperationIds(frames, { retention: RETENTION, peers });

    expect(compactable.map(String)).toEqual(['op-1', 'op-2']);
  });

  it('never lets one device’s acknowledgement cover another device’s operation', () => {
    const frames = [
      frameOf({ id: 'op-a2', millis: NOW - 2 * MILLIS_PER_DAY, device: 'device-a' }),
      frameOf({ id: 'op-c1', millis: NOW - 3 * MILLIS_PER_DAY, device: 'device-c' }),
    ];
    const peers = [peer({ id: 'device-b', acknowledged: { 'device-a': 'op-a2' } })];

    const compactable = compactableOperationIds(frames, { retention: RETENTION, peers });

    expect(compactable.map(String)).toEqual(['op-a2']);
  });

  it('judges acknowledgement per scope', () => {
    const frames = [
      frameOf({ id: 'op-1', millis: NOW - MILLIS_PER_DAY, scope: 'scope-2' }),
    ];
    const peers = [
      peer({ id: 'device-b', scope: 'scope-1', acknowledged: { 'device-a': 'op-1' } }),
    ];

    expect(
      compactableOperationIds(frames, { retention: RETENTION, peers }),
    ).toEqual([]);
  });

  it('treats an acknowledgement it cannot resolve as covering nothing', () => {
    const frames = [frameOf({ id: 'op-1', millis: NOW - MILLIS_PER_DAY })];
    const peers = [peer({ id: 'device-b', acknowledged: { 'device-a': 'op-gone' } })];

    expect(
      compactableOperationIds(frames, { retention: RETENTION, peers }),
    ).toEqual([]);
  });

  it('rejects a window of zero or less', () => {
    expect(() =>
      compactableOperationIds([], { retention: { retentionDays: 0, now: NOW }, peers: [] }),
    ).toThrow(RangeError);
  });
});

describe('releasableTombstones', () => {
  it('releases a tombstone every trusted peer has acknowledged', () => {
    const tombstones = [tombstoneOf(['device-b', 'device-c'])];
    const peers = [peer({ id: 'device-b' }), peer({ id: 'device-c' })];

    expect(releasableTombstones(tombstones, peers)).toEqual(tombstones);
  });

  it('keeps a tombstone one trusted peer has not acknowledged', () => {
    const peers = [peer({ id: 'device-b' }), peer({ id: 'device-c' })];

    expect(releasableTombstones([tombstoneOf(['device-b'])], peers)).toEqual([]);
  });

  it('ignores acknowledgements from devices that are no longer trusted', () => {
    const peers = [peer({ id: 'device-b' })];

    expect(releasableTombstones([tombstoneOf(['device-b', 'device-gone'])], peers)).toEqual(
      [tombstoneOf(['device-b', 'device-gone'])],
    );
  });

  it('keeps every tombstone while no peer is trusted, however old', () => {
    expect(releasableTombstones([tombstoneOf([])], [])).toEqual([]);
  });
});
