import { describe, it, expect, afterEach } from 'vitest';
import { deviceLimitState } from './deviceLimit';

afterEach(() => {
  deviceLimitState.set(false);
});

describe('deviceLimitState', () => {
  it('defaults to off and reads the current value', () => {
    expect(deviceLimitState.current()).toBe(false);
    deviceLimitState.set(true);
    expect(deviceLimitState.current()).toBe(true);
  });

  it('notifies subscribers only on a real change', () => {
    let calls = 0;
    const stop = deviceLimitState.subscribe(() => {
      calls += 1;
    });
    deviceLimitState.set(true);
    deviceLimitState.set(true); // no-op, same value
    deviceLimitState.set(false);
    expect(calls).toBe(2);
    stop();
    deviceLimitState.set(true);
    expect(calls).toBe(2); // unsubscribed
  });
});
