import { describe, expect, it } from 'vitest';
import { PairingError, PairingErrorCode } from './pairing.types';
import {
  MAX_QR_CHUNK_BYTES,
  MAX_QR_PARTS,
  joinQrParts,
  parseQrPart,
  splitIntoQrParts,
} from './qrSequence';

const SESSION = 'ICEiIyQlJicoKSorLC0uLw';
const split = (text: string): string[] => splitIntoQrParts({ sessionId: SESSION, text });
const roundTrip = (text: string): string => joinQrParts(split(text).map(parseQrPart));

const codeOf = (run: () => unknown): PairingErrorCode => {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(PairingError);
    return (error as PairingError).code;
  }
  throw new Error('expected a PairingError');
};

describe('splitIntoQrParts', () => {
  it('emits a single symbol when the payload fits', () => {
    const parts = split('short-payload');
    expect(parts).toHaveLength(1);
    expect(parts[0]).toBe(`W1:${SESSION}:1/1:short-payload`);
  });

  it('splits at the chunk ceiling', () => {
    expect(split('a'.repeat(MAX_QR_CHUNK_BYTES + 1))).toHaveLength(2);
  });

  it('never emits an empty sequence', () => {
    expect(split('')).toHaveLength(1);
  });

  it('refuses a payload needing more than the part ceiling', () => {
    // Never truncate and never relax validation to make a payload fit.
    const oversized = 'a'.repeat(MAX_QR_CHUNK_BYTES * (MAX_QR_PARTS + 1));
    expect(codeOf(() => split(oversized))).toBe(PairingErrorCode.OversizedPayload);
  });
});

describe('round trip', () => {
  it('reassembles a single-symbol payload', () => {
    expect(roundTrip('short-payload')).toBe('short-payload');
  });

  it('reassembles a multi-symbol payload byte for byte', () => {
    const text = Array.from({ length: MAX_QR_CHUNK_BYTES * 3 }, (_u, i) =>
      'abcdefghijklmnopqrstuvwxyz0123456789-_'[i % 38],
    ).join('');
    expect(roundTrip(text)).toBe(text);
  });

  it('reassembles regardless of the order symbols were scanned in', () => {
    const text = 'x'.repeat(MAX_QR_CHUNK_BYTES * 3);
    const parts = split(text).map(parseQrPart);
    expect(joinQrParts([...parts].reverse())).toBe(text);
  });
});

describe('parseQrPart', () => {
  it('rejects a symbol that is not a pairing part', () => {
    expect(codeOf(() => parseQrPart('https://example.test'))).toBe(
      PairingErrorCode.BadQrSequence,
    );
  });

  it('rejects an index outside its declared total', () => {
    expect(codeOf(() => parseQrPart(`W1:${SESSION}:4/3:body`))).toBe(
      PairingErrorCode.BadQrSequence,
    );
  });

  it('rejects an implausible part count', () => {
    expect(codeOf(() => parseQrPart(`W1:${SESSION}:1/99:body`))).toBe(
      PairingErrorCode.BadQrSequence,
    );
  });
});

describe('joinQrParts', () => {
  it('rejects an empty set', () => {
    expect(codeOf(() => joinQrParts([]))).toBe(PairingErrorCode.BadQrSequence);
  });

  it('rejects an incomplete sequence rather than filling the gap', () => {
    const parts = split('y'.repeat(MAX_QR_CHUNK_BYTES * 3)).map(parseQrPart);
    expect(codeOf(() => joinQrParts(parts.slice(0, 2)))).toBe(PairingErrorCode.BadQrSequence);
  });

  it('rejects a duplicated symbol', () => {
    const parts = split('z'.repeat(MAX_QR_CHUNK_BYTES * 2)).map(parseQrPart);
    const first = parts[0];
    if (!first) throw new Error('expected a part');
    expect(codeOf(() => joinQrParts([first, first]))).toBe(PairingErrorCode.BadQrSequence);
  });

  it('rejects parts belonging to different sessions', () => {
    const mine = split('a'.repeat(MAX_QR_CHUNK_BYTES * 2)).map(parseQrPart);
    const theirs = splitIntoQrParts({
      sessionId: 'QUJDREVGR0hJSktMTU5PUA',
      text: 'a'.repeat(MAX_QR_CHUNK_BYTES * 2),
    }).map(parseQrPart);
    const first = mine[0];
    const second = theirs[1];
    if (!first || !second) throw new Error('expected parts');
    expect(codeOf(() => joinQrParts([first, second]))).toBe(PairingErrorCode.BadQrSequence);
  });

  it('rejects parts that disagree on the total', () => {
    const first = parseQrPart(`W1:${SESSION}:1/2:aa`);
    const second = parseQrPart(`W1:${SESSION}:2/3:bb`);
    expect(codeOf(() => joinQrParts([first, second]))).toBe(PairingErrorCode.BadQrSequence);
  });
});
