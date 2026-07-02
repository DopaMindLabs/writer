import { describe, it, expect } from 'vitest';
import { nextHueIndexForKey } from './presenceHueKeyboard';

describe('nextHueIndexForKey', () => {
  it('advances, retreats, and wraps around the group', () => {
    expect(nextHueIndexForKey('ArrowRight', 0, 5)).toBe(1);
    expect(nextHueIndexForKey('ArrowDown', 4, 5)).toBe(0);
    expect(nextHueIndexForKey('ArrowLeft', 0, 5)).toBe(4);
    expect(nextHueIndexForKey('ArrowUp', 2, 5)).toBe(1);
  });

  it('jumps to the ends and ignores unrelated keys', () => {
    expect(nextHueIndexForKey('Home', 3, 5)).toBe(0);
    expect(nextHueIndexForKey('End', 1, 5)).toBe(4);
    expect(nextHueIndexForKey('Enter', 2, 5)).toBeNull();
    expect(nextHueIndexForKey('a', 2, 5)).toBeNull();
  });
});
