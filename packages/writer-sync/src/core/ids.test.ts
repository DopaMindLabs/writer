import { describe, expect, it } from 'vitest';
import type { DeviceId, PrincipalId } from './ids';
import { asDeviceId, asOperationId, asPrincipalId } from './ids';

describe('branded id converters', () => {
  it('tag a raw string without changing its runtime value', () => {
    expect(asPrincipalId('abc')).toBe('abc');
    expect(asDeviceId('dev-1')).toBe('dev-1');
    expect(asOperationId('op-1')).toBe('op-1');
  });

  it('remain usable as plain strings for storage and comparison', () => {
    const principal = asPrincipalId('person-1');

    // A branded id is a string subtype: it indexes and compares like one.
    expect(String(principal)).toBe('person-1');
    expect(principal === asPrincipalId('person-1')).toBe(true);
  });

  it('keep principal and device identities distinct at compile time', () => {
    // The compile-time guarantee (a PrincipalId is not assignable to a DeviceId
    // and vice versa) is enforced by `npm run typecheck`; asserting it here would
    // require a suppression, which the standards forbid. This test documents the
    // sanctioned round-trip: an explicit conversion is always required.
    const principal: PrincipalId = asPrincipalId('p');
    const device: DeviceId = asDeviceId(String(principal));

    expect(String(device)).toBe(String(principal));
  });
});
