import type { QrDetector, QrDetectorFactory } from './scan.types';

/**
 * The production factory: the platform's own `BarcodeDetector` where it exists
 * (Chromium), otherwise the `barcode-detector` ponyfill — imported dynamically
 * so its WASM engine is fetched only on browsers that need it, and only when a
 * scanning surface actually opens.
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

export const defaultQrDetectorFactory = (): QrDetectorFactory => {
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
      const { BarcodeDetector } = await import('barcode-detector/ponyfill');
      return asQrDetector(new BarcodeDetector(QR_FORMATS));
    },
  };
};
