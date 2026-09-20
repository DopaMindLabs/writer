import { describe, expect, it } from 'vitest';
import { fromBase64Url, toBase64Url } from './base64url';

describe('base64url', () => {
  it('uses the URL alphabet and omits padding', () => {
    // 0xFB 0xFF encodes to "+/8=" in standard base64.
    expect(toBase64Url(new Uint8Array([0xfb, 0xff]))).toBe('-_8');
  });

  it('round-trips every input length modulo 3', () => {
    for (let length = 0; length <= 6; length += 1) {
      const bytes = new Uint8Array(Array.from({ length }, (_, i) => i * 40));
      expect(fromBase64Url(toBase64Url(bytes))).toEqual(bytes);
    }
  });

  it('decodes text that carries padding anyway', () => {
    expect(fromBase64Url('-_8=')).toEqual(new Uint8Array([0xfb, 0xff]));
  });
});
