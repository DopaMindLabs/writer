import { describe, it, expect } from 'vitest';
import {
  DEFAULT_DEVICE_REFRESH_INTERVAL_MS,
  DEFAULT_DEVICE_STALE_AFTER_MS,
  DEVICE_LIMIT,
  DEVICE_REFRESH_INTERVAL_MS,
  DEVICE_STALE_AFTER_MS,
  isStaleDevice,
  liveDevices,
  planDeviceRegistration,
  type DeviceRecord,
} from './devicePolicy';

const NOW = 1_700_000_000_000;

const device = (
  id: string,
  overrides: Partial<DeviceRecord> = {},
): DeviceRecord => ({
  id,
  joinedAt: NOW - DEVICE_REFRESH_INTERVAL_MS,
  lastSeenAt: NOW,
  ...overrides,
});

/** A row last seen long enough ago that its slot is reclaimable. */
const staleDevice = (id: string): DeviceRecord =>
  device(id, { lastSeenAt: NOW - DEVICE_STALE_AFTER_MS - 1 });

describe('device policy constants', () => {
  it('caps the beta at four devices', () => {
    expect(DEVICE_LIMIT).toBe(4);
  });

  it('ships defaults that leave a live device two orders of magnitude of slack', () => {
    // The refresh interval and the idle window must never fight: a device that
    // refreshes on schedule has to miss a great many refreshes in a row before a
    // peer may reclaim its slot. Without this margin a healthy device could lose
    // its slot to a clock skew or a long sleep.
    //
    // The guard is on the shipped defaults, not the live values: a deployment may
    // deliberately shorten both (VITE_DEVICE_REFRESH_SECONDS /
    // VITE_DEVICE_STALE_SECONDS) to exercise the reclaim in seconds, where losing
    // a slot costs nothing.
    expect(DEFAULT_DEVICE_REFRESH_INTERVAL_MS * 100).toBeLessThanOrEqual(
      DEFAULT_DEVICE_STALE_AFTER_MS,
    );
  });

  it('falls back to the shipped defaults when no override is set', () => {
    expect(DEVICE_REFRESH_INTERVAL_MS).toBe(DEFAULT_DEVICE_REFRESH_INTERVAL_MS);
    expect(DEVICE_STALE_AFTER_MS).toBe(DEFAULT_DEVICE_STALE_AFTER_MS);
  });
});

describe('isStaleDevice', () => {
  it('is false for a device seen within the idle window', () => {
    expect(isStaleDevice(device('a', { lastSeenAt: NOW - 1000 }), NOW)).toBe(false);
  });

  it('is true only once the idle window has fully elapsed', () => {
    const onTheEdge = device('a', { lastSeenAt: NOW - DEVICE_STALE_AFTER_MS });
    expect(isStaleDevice(onTheEdge, NOW)).toBe(false);
    expect(isStaleDevice(staleDevice('a'), NOW)).toBe(true);
  });
});

describe('liveDevices', () => {
  it('counts neither stale nor revoked rows against the limit', () => {
    const rows = [
      device('live'),
      staleDevice('stale'),
      device('revoked', { revokedAt: NOW }),
    ];
    expect(liveDevices(rows, NOW).map((row) => row.id)).toEqual(['live']);
  });
});

describe('planDeviceRegistration', () => {
  it('writes nothing for a device whose row is still fresh', () => {
    // The regression that mattered: an unconditional write here is a mutation on
    // a synced table, which pushes, settles the sync, re-runs the registrar and
    // writes again — an unbounded sync loop.
    const plan = planDeviceRegistration({
      rows: [device('me', { lastSeenAt: NOW - 1000 })],
      ownId: 'me',
      now: NOW,
    });
    expect(plan.write).toBeNull();
    expect(plan.evict).toEqual([]);
    expect(plan.revoked).toBe(false);
  });

  it('refreshes lastSeenAt once the refresh interval has elapsed, keeping joinedAt', () => {
    const joinedAt = NOW - 500_000;
    const plan = planDeviceRegistration({
      rows: [
        { id: 'me', joinedAt, lastSeenAt: NOW - DEVICE_REFRESH_INTERVAL_MS },
      ],
      ownId: 'me',
      now: NOW,
    });
    expect(plan.write).toEqual({ id: 'me', joinedAt, lastSeenAt: NOW });
  });

  it('corrects a row stamped in the future when the clock moved backwards', () => {
    // A future lastSeenAt would never age into a refresh, so the row would freeze
    // and peers would eventually reclaim a perfectly live device's slot.
    const plan = planDeviceRegistration({
      rows: [device('me', { lastSeenAt: NOW + 60_000 })],
      ownId: 'me',
      now: NOW,
    });
    expect(plan.write?.lastSeenAt).toBe(NOW);
  });

  it('joins the account when a slot is free', () => {
    const plan = planDeviceRegistration({
      rows: [device('other')],
      ownId: 'me',
      now: NOW,
    });
    expect(plan.write).toEqual({ id: 'me', joinedAt: NOW, lastSeenAt: NOW });
  });

  it('refuses to join when every slot is live', () => {
    const rows = ['a', 'b', 'c', 'd'].map((id) => device(id));
    const plan = planDeviceRegistration({ rows, ownId: 'me', now: NOW });
    expect(plan.write).toBeNull();
  });

  it('takes a slot freed by evicting a stale peer', () => {
    const rows = [device('a'), device('b'), device('c'), staleDevice('dead')];
    const plan = planDeviceRegistration({ rows, ownId: 'me', now: NOW });
    expect(plan.evict).toEqual(['dead']);
    expect(plan.write).toEqual({ id: 'me', joinedAt: NOW, lastSeenAt: NOW });
  });

  it('evicts a stale peer but never this device, however stale it looks', () => {
    const rows = [staleDevice('me'), staleDevice('peer')];
    const plan = planDeviceRegistration({ rows, ownId: 'me', now: NOW });
    expect(plan.evict).toEqual(['peer']);
    expect(plan.write?.id).toBe('me');
  });

  it('never writes for a revoked device, and reports the revocation', () => {
    // The whole guarantee of revoking: the device loses its slot and cannot
    // silently retake it on the next sync.
    const plan = planDeviceRegistration({
      rows: [device('me', { revokedAt: NOW })],
      ownId: 'me',
      now: NOW,
    });
    expect(plan.write).toBeNull();
    expect(plan.revoked).toBe(true);
  });

  it('keeps a fresh tombstone so the revoked device can see it, while freeing its slot', () => {
    const rows = [
      device('a'),
      device('b'),
      device('c'),
      device('revoked', { revokedAt: NOW }),
    ];
    const plan = planDeviceRegistration({ rows, ownId: 'me', now: NOW });
    expect(plan.evict).toEqual([]);
    expect(plan.write?.id).toBe('me');
  });

  it('sweeps a tombstone the revoked device has had long enough to see', () => {
    const rows = [
      device('revoked', { revokedAt: NOW - DEVICE_STALE_AFTER_MS - 1 }),
    ];
    const plan = planDeviceRegistration({ rows, ownId: 'me', now: NOW });
    expect(plan.evict).toEqual(['revoked']);
  });
});
