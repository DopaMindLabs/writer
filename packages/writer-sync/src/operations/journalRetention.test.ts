import { describe, expect, it } from 'vitest';
import { asDeviceId, asOperationId } from '../core/ids';
import type { EncryptedSyncFrame } from './operation.types';
import {
  JOURNAL_RETENTION_DEFAULT_DAYS,
  MILLIS_PER_DAY,
  expiredOperationIds,
  requiresFullExchange,
  retentionCutoff,
} from './journalRetention';

const NOW = 1_700_000_000_000;

const frameAt = (id: string, millis: number): EncryptedSyncFrame => ({
  v: 1,
  operationId: asOperationId(id),
  accessScopeId: 'scope-1',
  entityTable: 'notes',
  entityId: 'note-1',
  kind: 'put',
  deviceId: asDeviceId('device-1'),
  logicalAt: { millis, counter: 0 },
  keyId: 'key-1',
  epoch: 1,
  payloadHash: 'hash',
  payload: 'cGF5bG9hZA',
  signature: '',
});

describe('retentionCutoff', () => {
  it('is the window subtracted from now', () => {
    expect(retentionCutoff({ retentionDays: 30, now: NOW })).toBe(
      NOW - 30 * MILLIS_PER_DAY,
    );
  });

  it('defaults to thirty days', () => {
    expect(JOURNAL_RETENTION_DEFAULT_DAYS).toBe(30);
  });

  it('rejects a window of zero or less', () => {
    expect(() => retentionCutoff({ retentionDays: 0, now: NOW })).toThrow(RangeError);
    expect(() => retentionCutoff({ retentionDays: -1, now: NOW })).toThrow(RangeError);
  });

  it('rejects a non-finite window', () => {
    expect(() =>
      retentionCutoff({ retentionDays: Number.POSITIVE_INFINITY, now: NOW }),
    ).toThrow(RangeError);
  });
});

describe('expiredOperationIds', () => {
  it('names frames older than the window and spares the rest', () => {
    const frames = [
      frameAt('op-old', NOW - 31 * MILLIS_PER_DAY),
      frameAt('op-edge', NOW - 30 * MILLIS_PER_DAY),
      frameAt('op-fresh', NOW - 1 * MILLIS_PER_DAY),
    ];

    const expired = expiredOperationIds(frames, { retentionDays: 30, now: NOW });

    expect(expired.map(String)).toEqual(['op-old', 'op-edge']);
  });

  it('names nothing when everything is within the window', () => {
    const frames = [frameAt('op-fresh', NOW - MILLIS_PER_DAY)];

    expect(expiredOperationIds(frames, { retentionDays: 30, now: NOW })).toEqual([]);
  });

  it('judges by logical wall time, not insertion order', () => {
    const frames = [
      frameAt('op-a', NOW - MILLIS_PER_DAY),
      frameAt('op-b', NOW - 90 * MILLIS_PER_DAY),
    ];

    const expired = expiredOperationIds(frames, { retentionDays: 30, now: NOW });

    expect(expired.map(String)).toEqual(['op-b']);
  });
});

describe('requiresFullExchange', () => {
  it('is false for a device seen within the window', () => {
    expect(
      requiresFullExchange(NOW - 10 * MILLIS_PER_DAY, { retentionDays: 30, now: NOW }),
    ).toBe(false);
  });

  it('is true for a device away longer than the window', () => {
    expect(
      requiresFullExchange(NOW - 31 * MILLIS_PER_DAY, { retentionDays: 30, now: NOW }),
    ).toBe(true);
  });

  it('is true for a device never seen at all', () => {
    expect(requiresFullExchange(undefined, { retentionDays: 30, now: NOW })).toBe(true);
  });
});
