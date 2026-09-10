import {
  QrScanError,
  type QrDetector,
  type QrDetectorFactory,
  type QrScanCapability,
  type QrScanner,
} from './scan.types';
import {
  defaultQrDetectorFactory,
  type QrDetectorFactoryOptions,
} from './defaultQrDetectorFactory';

/**
 * The scanning facade. The detector is created lazily — on non-Chromium
 * browsers creation loads the WASM polyfill, which must not happen before the
 * user actually opens a scanning surface — and exactly once, however many
 * images are scanned through it.
 */
export interface QrScannerOptions extends QrDetectorFactoryOptions {
  /** Injected in tests; defaults to the platform detector or the ponyfill. */
  factory?: QrDetectorFactory;
}

export const createQrScanner = (options: QrScannerOptions = {}): QrScanner => {
  const resolved: QrDetectorFactory =
    options.factory ?? defaultQrDetectorFactory({ wasmUrl: options.wasmUrl });
  let detector: Promise<QrDetector> | null = null;

  const detectorOnce = (): Promise<QrDetector> => (detector ??= resolved.create());

  return {
    capability: (): Promise<QrScanCapability> =>
      Promise.resolve(resolved.native ? 'native' : 'polyfill'),
    scanImage: async (source) => {
      let ready: QrDetector;
      try {
        ready = await detectorOnce();
      } catch (cause) {
        detector = null; // A failed creation must not poison every later scan.
        throw new QrScanError('the detector could not be created', { cause });
      }
      try {
        return await ready.detect(source);
      } catch (cause) {
        throw new QrScanError('the image could not be decoded', { cause });
      }
    },
  };
};
