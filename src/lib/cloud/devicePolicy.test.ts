import { describe, it, expect } from 'vitest';
import { DEVICE_LIMIT } from './devicePolicy';

describe('DEVICE_LIMIT', () => {
  it('caps the beta at four devices', () => {
    expect(DEVICE_LIMIT).toBe(4);
  });
});
