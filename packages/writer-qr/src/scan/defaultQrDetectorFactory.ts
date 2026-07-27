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

const asQrDetector = (platform: PlatformBarcodeDetector): QrDetector => ({
  detect: async (source) =>
    (await platform.detect(source)).map((found) => found.rawValue),
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
