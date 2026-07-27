import { describe, expect, it } from 'vitest';
import { PairingErrorCode } from './pairing.types';
import { createQrPartCollector } from './qrPartCollector';
import { splitIntoQrParts } from './qrSequence';

const SESSION = 'c2Vzc2lvbi1pZC0xMjM0';
const OTHER_SESSION = 'YW5vdGhlci1zZXNzaW9u';

const symbolsFor = (text: string, sessionId = SESSION): string[] =>
  splitIntoQrParts({ sessionId, text });

describe('createQrPartCollector', () => {
  it('reports nothing collected before the first scan', () => {
    const collector = createQrPartCollector();

    expect(collector.progress()).toEqual({
      sessionId: null,
      received: 0,
      total: null,
      missing: [],
      text: null,
    });
  });

  it('completes immediately on a single-symbol payload', () => {
    const collector = createQrPartCollector();
    const [only] = symbolsFor('short-payload');

    const progress = collector.accept(only);

    expect(progress.text).toBe('short-payload');
    expect(progress.received).toBe(1);
    expect(progress.total).toBe(1);
    expect(progress.missing).toEqual([]);
  });

  it('withholds the payload until every symbol has arrived', () => {
    const text = 'a'.repeat(2500);
    const collector = createQrPartCollector();
    const symbols = symbolsFor(text);

    const first = collector.accept(symbols[0]);
    const second = collector.accept(symbols[1]);
    const third = collector.accept(symbols[2]);

    expect(first.text).toBeNull();
    expect(second.text).toBeNull();
    expect(third.text).toBe(text);
  });

  it('names the symbols still outstanding', () => {
    const collector = createQrPartCollector();
    const symbols = symbolsFor('b'.repeat(2500));

    const progress = collector.accept(symbols[1]);

    expect(progress.missing).toEqual([1, 3]);
    expect(progress.received).toBe(1);
    expect(progress.total).toBe(3);
  });

  it('accepts symbols in any order', () => {
    const text = 'c'.repeat(2500);
    const collector = createQrPartCollector();
    const symbols = symbolsFor(text);

    collector.accept(symbols[2]);
    collector.accept(symbols[0]);

    expect(collector.accept(symbols[1]).text).toBe(text);
  });

  it('treats a re-scanned symbol as no new progress', () => {
    const collector = createQrPartCollector();
    const symbols = symbolsFor('d'.repeat(2500));

    collector.accept(symbols[0]);
    const progress = collector.accept(symbols[0]);

    expect(progress.received).toBe(1);
    expect(progress.missing).toEqual([2, 3]);
  });

  it('refuses a symbol from a different session rather than switching', () => {
    const collector = createQrPartCollector();
    collector.accept(symbolsFor('e'.repeat(2500))[0]);

    expect(() => collector.accept(symbolsFor('f'.repeat(2500), OTHER_SESSION)[0])).toThrow(
      expect.objectContaining({ code: PairingErrorCode.BadQrSequence }),
    );
  });

  it('refuses an unrecognisable symbol', () => {
    const collector = createQrPartCollector();

    expect(() => collector.accept('definitely not a pairing symbol')).toThrow(
      expect.objectContaining({ code: PairingErrorCode.BadQrSequence }),
    );
  });

  it('starts over after a reset', () => {
    const collector = createQrPartCollector();
    collector.accept(symbolsFor('g'.repeat(2500))[0]);

    collector.reset();

    expect(collector.progress().received).toBe(0);
    expect(collector.progress().sessionId).toBeNull();
  });

  it('accepts a different session once reset', () => {
    const text = 'h'.repeat(2500);
    const collector = createQrPartCollector();
    collector.accept(symbolsFor(text)[0]);

    collector.reset();
    const progress = collector.accept(symbolsFor(text, OTHER_SESSION)[0]);

    expect(progress.sessionId).toBe(OTHER_SESSION);
  });
});
