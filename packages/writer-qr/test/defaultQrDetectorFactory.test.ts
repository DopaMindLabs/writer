import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultQrDetectorFactory } from '../src/scan/index';

/**
 * The platform detector, and the one source it will not take.
 *
 * Chromium's own `BarcodeDetector` rejects a `Blob` with "Unsupported source"
 * even though the IDL admits one, so an uploaded photograph — which arrives as
 * a `File` — has to be decoded to a bitmap before it is handed over. The
 * ponyfill accepts either, so the fault appears only on browsers that have the
 * platform detector, which is why it survived a suite that never had one.
 */

interface Detected {
  rawValue: string;
}

const globals = globalThis as unknown as Record<string, unknown>;

const original = {
  BarcodeDetector: globals.BarcodeDetector,
  createImageBitmap: globals.createImageBitmap,
};

/** Stands in for Chromium's detector, including what it refuses. */
const installPlatformDetector = (found: string[]): { sources: unknown[] } => {
  const sources: unknown[] = [];
  globals.BarcodeDetector = function BarcodeDetector(this: {
    detect: (source: unknown) => Promise<Detected[]>;
  }) {
    this.detect = (source: unknown) => {
      sources.push(source);
      if (source instanceof Blob) {
        return Promise.reject(
          new Error("Failed to execute 'detect' on 'BarcodeDetector': Unsupported source."),
        );
      }
      return Promise.resolve(found.map((rawValue) => ({ rawValue })));
    };
  };
  return { sources };
};

afterEach(() => {
  globals.BarcodeDetector = original.BarcodeDetector;
  globals.createImageBitmap = original.createImageBitmap;
});

describe('defaultQrDetectorFactory', () => {
  it('decodes a photograph to a bitmap the platform detector will accept', async () => {
    const platform = installPlatformDetector(['W1:abc:1/1:x']);
    const close = vi.fn();
    const bitmap = { width: 1, height: 1, close };
    const createBitmap = vi.fn(() => Promise.resolve(bitmap));
    globals.createImageBitmap = createBitmap;

    const factory = defaultQrDetectorFactory();
    const detector = await factory.create();
    const photograph = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' });

    expect(await detector.detect(photograph as unknown as ImageBitmapSource)).toEqual([
      'W1:abc:1/1:x',
    ]);
    expect(createBitmap).toHaveBeenCalledWith(photograph);
    expect(platform.sources).toEqual([bitmap]);
    // The bitmap holds decoded pixels; leaving one per photograph would grow
    // without bound over a scan that takes several attempts.
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('hands any other source to the platform detector untouched', async () => {
    const platform = installPlatformDetector(['W1:abc:1/1:x']);
    const createBitmap = vi.fn();
    globals.createImageBitmap = createBitmap;

    const detector = await defaultQrDetectorFactory().create();
    const video = { tagName: 'VIDEO' } as unknown as ImageBitmapSource;

    expect(await detector.detect(video)).toEqual(['W1:abc:1/1:x']);
    // A live camera frame is already a source the detector takes; decoding it
    // again per frame would cost a copy of every frame for nothing.
    expect(createBitmap).not.toHaveBeenCalled();
    expect(platform.sources).toEqual([video]);
  });

  it('releases the bitmap even when decoding finds nothing', async () => {
    installPlatformDetector([]);
    const close = vi.fn();
    globals.createImageBitmap = () =>
      Promise.resolve({ width: 1, height: 1, close });

    const detector = await defaultQrDetectorFactory().create();
    const photograph = new Blob([new Uint8Array([1])], { type: 'image/png' });

    expect(await detector.detect(photograph as unknown as ImageBitmapSource)).toEqual([]);
    expect(close).toHaveBeenCalledTimes(1);
  });
});

/**
 * The ponyfill branch — the path every WebKit browser takes, since none of them
 * ship a platform `BarcodeDetector`. The module is mocked: what matters here is
 * the wiring, above all that the WASM engine is pointed at the URL the host
 * serves rather than the ponyfill's default CDN.
 */
describe('defaultQrDetectorFactory, without a platform detector', () => {
  it('falls back to the ponyfill and points its engine at the served WASM', async () => {
    vi.resetModules();
    const prepareZXingModule = vi.fn();
    const detect = vi.fn(() => Promise.resolve([{ rawValue: 'W1:abc:1/1:x' }]));
    vi.doMock('barcode-detector/ponyfill', () => ({
      BarcodeDetector: function BarcodeDetector(this: { detect: typeof detect }) {
        this.detect = detect;
      },
      prepareZXingModule,
    }));
    try {
      delete globals.BarcodeDetector;
      const { defaultQrDetectorFactory: fresh } = await import('../src/scan/index');

      const factory = fresh({ wasmUrl: '/assets/zxing_reader.wasm' });
      expect(factory.native).toBe(false);

      const detector = await factory.create();
      expect(prepareZXingModule).toHaveBeenCalledTimes(1);
      const overrides = prepareZXingModule.mock.calls[0][0] as {
        overrides: { locateFile: () => string };
        fireImmediately: boolean;
      };
      // Left to its own devices the ponyfill fetches its engine from a public
      // CDN at first use — offline scanning and contacting nobody both depend
      // on this override.
      expect(overrides.overrides.locateFile()).toBe('/assets/zxing_reader.wasm');
      expect(overrides.fireImmediately).toBe(false);

      const video = { tagName: 'VIDEO' } as unknown as ImageBitmapSource;
      expect(await detector.detect(video)).toEqual(['W1:abc:1/1:x']);
    } finally {
      vi.doUnmock('barcode-detector/ponyfill');
      vi.resetModules();
    }
  });

  it('leaves the engine alone when no WASM URL is given', async () => {
    vi.resetModules();
    const prepareZXingModule = vi.fn();
    vi.doMock('barcode-detector/ponyfill', () => ({
      BarcodeDetector: function BarcodeDetector(this: { detect: () => Promise<never[]> }) {
        this.detect = () => Promise.resolve([]);
      },
      prepareZXingModule,
    }));
    try {
      delete globals.BarcodeDetector;
      const { defaultQrDetectorFactory: fresh } = await import('../src/scan/index');

      await fresh().create();

      expect(prepareZXingModule).not.toHaveBeenCalled();
    } finally {
      vi.doUnmock('barcode-detector/ponyfill');
      vi.resetModules();
    }
  });
});
