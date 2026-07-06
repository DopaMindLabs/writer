import { describe, it, expect } from 'vitest';
import { asBuffer, utf8, u32, concatLengthPrefixed } from './bytes';

describe('bytes', () => {
  describe('asBuffer', () => {
    it('copies the exact view of a whole array', () => {
      const bytes = new Uint8Array([1, 2, 3, 4]);
      const buf = asBuffer(bytes);
      expect(new Uint8Array(buf)).toEqual(bytes);
    });

    it('copies only the subarray region, not the backing buffer', () => {
      const backing = new Uint8Array([0, 1, 2, 3, 4, 5]);
      const view = backing.subarray(2, 5);
      const buf = asBuffer(view);
      expect(buf.byteLength).toBe(3);
      expect(new Uint8Array(buf)).toEqual(new Uint8Array([2, 3, 4]));
    });

    it('is a copy — mutating the source does not change the buffer', () => {
      const bytes = new Uint8Array([9, 9]);
      const buf = asBuffer(bytes);
      bytes[0] = 0;
      expect(new Uint8Array(buf)[0]).toBe(9);
    });
  });

  describe('utf8', () => {
    it('encodes ASCII', () => {
      expect([...utf8('AB')]).toEqual([65, 66]);
    });

    it('encodes multi-byte code points', () => {
      expect([...utf8('é')]).toEqual([0xc3, 0xa9]);
    });
  });

  describe('u32', () => {
    it('encodes big-endian', () => {
      expect([...u32(1)]).toEqual([0, 0, 0, 1]);
      expect([...u32(0x01020304)]).toEqual([1, 2, 3, 4]);
    });

    it('encodes zero and the max unsigned value', () => {
      expect([...u32(0)]).toEqual([0, 0, 0, 0]);
      expect([...u32(0xffffffff)]).toEqual([255, 255, 255, 255]);
    });
  });

  describe('concatLengthPrefixed', () => {
    it('prefixes each part with its big-endian length', () => {
      const out = concatLengthPrefixed([new Uint8Array([0xaa]), new Uint8Array([0xbb, 0xcc])]);
      expect([...out]).toEqual([0, 0, 0, 1, 0xaa, 0, 0, 0, 2, 0xbb, 0xcc]);
    });

    it('encodes an empty list as an empty buffer', () => {
      expect(concatLengthPrefixed([]).byteLength).toBe(0);
    });

    it('distinguishes boundaries that a plain concat would collide', () => {
      const a = concatLengthPrefixed([new Uint8Array([1, 2]), new Uint8Array([3])]);
      const b = concatLengthPrefixed([new Uint8Array([1]), new Uint8Array([2, 3])]);
      expect([...a]).not.toEqual([...b]);
    });
  });
});
