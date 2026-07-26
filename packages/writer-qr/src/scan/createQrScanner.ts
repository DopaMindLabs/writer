import {
  QrScanError,
  type QrDetector,
  type QrDetectorFactory,
  type QrScanCapability,
  type QrScanner,
} from './scan.types';
import { defaultQrDetectorFactory } from './defaultQrDetectorFactory';

/**
 * The scanning facade. The detector is created lazily — on non-Chromium
 * browsers creation loads the WASM polyfill, which must not happen before the
 * user actually opens a scanning surface — and exactly once, however many
 * images are scanned through it.
 */
export const createQrScanner = (
  factory: QrDetectorFactory = defaultQrDetectorFactory(),
): QrScanner => {
  let detector: Promise<QrDetector> | null = null;

  const detectorOnce = (): Promise<QrDetector> => (detector ??= factory.create());

  return {
    capability: (): Promise<QrScanCapability> =>
      Promise.resolve(factory.native ? 'native' : 'polyfill'),
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
