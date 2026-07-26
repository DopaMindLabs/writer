import { describe, expect, it } from 'vitest';
import {
  QrEncodingError,
  QR_MAX_TEXT_CHARS,
  encodeQrMatrix,
  encodeQrSvg,
} from '../src/encode/index';

/** A realistic pairing payload: 1008 base64url chars in byte mode, the size the
 *  QR dependency ADR measured for a complete signed offer. */
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const measuredPayload = Array.from({ length: 1008 }, (_, i) => chars[(i * 37) % 64]).join('');

describe('encodeQrMatrix', () => {
  it('encodes text into a square boolean module matrix', () => {
    const matrix = encodeQrMatrix('hello');
    expect(matrix.size).toBeGreaterThan(0);
    expect(matrix.modules).toHaveLength(matrix.size);
    for (const row of matrix.modules) {
      expect(row).toHaveLength(matrix.size);
      for (const cell of row) expect(typeof cell).toBe('boolean');
    }
  });

  it('is deterministic for the same input', () => {
    expect(encodeQrMatrix('same input')).toEqual(encodeQrMatrix('same input'));
  });

  it('encodes the measured real pairing payload within one symbol', () => {
    const matrix = encodeQrMatrix(measuredPayload, { ecc: 'L' });
    // Version 23 at ECC L per the ADR measurement; the exact version may shift
    // with encoder mode selection, but a symbol above version 30 would signal a
    // regression in how the payload is being encoded.
    expect(matrix.version).toBeGreaterThanOrEqual(20);
    expect(matrix.version).toBeLessThanOrEqual(30);
    expect(matrix.size).toBe(matrix.version * 4 + 17 + 2 * matrix.border);
  });

  it('honours the requested error-correction level', () => {
    const low = encodeQrMatrix(measuredPayload, { ecc: 'L' });
    const high = encodeQrMatrix(measuredPayload, { ecc: 'H' });
    // Higher correction always costs a bigger symbol for the same payload.
    expect(high.version).toBeGreaterThan(low.version);
  });

  it('rejects empty text', () => {
    expect(() => encodeQrMatrix('')).toThrow(QrEncodingError);
  });

  it('rejects text beyond the byte-mode capacity ceiling', () => {
    expect(() => encodeQrMatrix('a'.repeat(QR_MAX_TEXT_CHARS + 1))).toThrow(QrEncodingError);
  });
});

describe('encodeQrSvg', () => {
  it('produces a square viewBox with a single path drawn in currentColor', () => {
    const svg = encodeQrSvg('hello');
    expect(svg.viewBox).toMatch(/^0 0 (\d+) \1$/);
    expect(svg.path).toMatch(/^M/);
    // The design system owns colour: the facade must never bake one in.
    expect(svg.path).not.toMatch(/#[0-9a-fA-F]{3}/);
  });

  it('draws one module square per dark cell', () => {
    const matrix = encodeQrMatrix('hello');
    const svg = encodeQrSvg('hello');
    const darkCells = matrix.modules.flat().filter(Boolean).length;
    const squares = svg.path.match(/M\d+ \d+h1v1h-1z/g) ?? [];
    expect(squares).toHaveLength(darkCells);
  });

  it('mirrors the matrix determinism', () => {
    expect(encodeQrSvg('same input')).toEqual(encodeQrSvg('same input'));
  });
});
