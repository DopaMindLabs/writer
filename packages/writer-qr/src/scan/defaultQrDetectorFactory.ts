import type { QrDetector, QrDetectorFactory } from './scan.types';

/**
 * The production factory: the platform's own `BarcodeDetector` where it exists
 * (Chromium), otherwise the `barcode-detector` ponyfill — imported dynamically
 * so its WASM engine is fetched only on browsers that need it, and only when a
 * scanning surface actually opens.
 *
 * The ponyfill's default is to fetch its WASM from a public CDN at first use.
 * That is wrong here twice over: scanning would fail with no internet, on a
 * feature whose whole premise is two devices on one local network, and it would
 * reach a third party to do something entirely local. The host therefore passes
 * a `wasmUrl` it serves itself, and this module never chooses an origin.
 */

interface DetectedQr {
  rawValue: string;
}

interface PlatformBarcodeDetector {
  detect: (source: ImageBitmapSource) => Promise<DetectedQr[]>;
}

type BarcodeDetectorConstructor = new (options: {
  formats: string[];
}) => PlatformBarcodeDetector;

const QR_FORMATS = { formats: ['qr_code' as const] };

export interface QrDetectorFactoryOptions {
  /**
   * Where the host serves the ponyfill's WASM engine. Omit only where the
   * platform detector is certain to exist — without it the ponyfill falls back
   * to its own CDN.
   */
  wasmUrl?: string;
}

/**
 * Give the detector a source it will actually take.
 *
 * Chromium's own detector refuses a `Blob` — "Unsupported source" — although
 * the IDL admits one, and a photograph the user uploaded arrives as exactly
 * that. Decoding it here keeps the refusal out of every caller; a source that
 * is not a `Blob` is already acceptable and is passed through, so a live camera
 * frame costs no copy. The bitmap is released either way: it holds decoded
 * pixels, and a scan may take many attempts before one reads.
 */
const asQrDetector = (platform: PlatformBarcodeDetector): QrDetector => ({
  detect: async (source) => {
    const bitmap = source instanceof Blob ? await createImageBitmap(source) : null;
    try {
      const found = await platform.detect(bitmap ?? source);
      return found.map((detected) => detected.rawValue);
    } finally {
      bitmap?.close();
    }
  },
});

const nativeConstructor = (): BarcodeDetectorConstructor | null => {
  const candidate = (globalThis as Record<string, unknown>).BarcodeDetector;
  return typeof candidate === 'function'
    ? (candidate as unknown as BarcodeDetectorConstructor)
    : null;
};

export const defaultQrDetectorFactory = (
  options: QrDetectorFactoryOptions = {},
): QrDetectorFactory => {
  const native = nativeConstructor();
  if (native) {
    return {
      native: true,
      create: () => Promise.resolve(asQrDetector(new native(QR_FORMATS))),
    };
  }
  return {
    native: false,
    create: async () => {
      const { BarcodeDetector, prepareZXingModule } = await import(
        'barcode-detector/ponyfill'
      );
      const { wasmUrl } = options;
      if (wasmUrl !== undefined) {
        prepareZXingModule({
          overrides: { locateFile: () => wasmUrl },
          fireImmediately: false,
        });
      }
      return asQrDetector(new BarcodeDetector(QR_FORMATS));
    },
  };
};
