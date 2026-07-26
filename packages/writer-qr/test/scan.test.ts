import { describe, expect, it, vi } from 'vitest';
import {
  QrScanError,
  createQrScanner,
  type QrDetector,
  type QrDetectorFactory,
} from '../src/scan/index';

/** A detector whose answers are scripted, so no camera or WASM is involved. */
const scriptedDetector = (values: string[][]): QrDetector => {
  let call = 0;
  return {
    detect: () => Promise.resolve(values[Math.min(call++, values.length - 1)] ?? []),
  };
};

const factoryOf = (detector: QrDetector, native: boolean): QrDetectorFactory => ({
  create: () => Promise.resolve(detector),
  native,
});

describe('createQrScanner', () => {
  it('reports the capability of the factory it was given', async () => {
    const scanner = createQrScanner(factoryOf(scriptedDetector([[]]), true));
    expect(await scanner.capability()).toBe('native');
    const polyfilled = createQrScanner(factoryOf(scriptedDetector([[]]), false));
    expect(await polyfilled.capability()).toBe('polyfill');
  });

  it('decodes the values found in a single image source', async () => {
    const scanner = createQrScanner(factoryOf(scriptedDetector([['W1:abc:1/2:x']]), true));
    const found = await scanner.scanImage({} as ImageBitmapSource);
    expect(found).toEqual(['W1:abc:1/2:x']);
  });

  it('returns an empty list when the image holds no code', async () => {
    const scanner = createQrScanner(factoryOf(scriptedDetector([[]]), true));
    expect(await scanner.scanImage({} as ImageBitmapSource)).toEqual([]);
  });

  it('creates the underlying detector once, not per scan', async () => {
    const create = vi.fn(() => Promise.resolve(scriptedDetector([['a'], ['b']])));
    const scanner = createQrScanner({ create, native: true });
    await scanner.scanImage({} as ImageBitmapSource);
    await scanner.scanImage({} as ImageBitmapSource);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('wraps a detector failure in a typed error', async () => {
    const failing: QrDetector = { detect: () => Promise.reject(new Error('boom')) };
    const scanner = createQrScanner(factoryOf(failing, true));
    await expect(scanner.scanImage({} as ImageBitmapSource)).rejects.toBeInstanceOf(QrScanError);
  });

  it('wraps a factory failure in a typed error', async () => {
    const scanner = createQrScanner({
      create: () => Promise.reject(new Error('no wasm')),
      native: false,
    });
    await expect(scanner.scanImage({} as ImageBitmapSource)).rejects.toBeInstanceOf(QrScanError);
  });
});
