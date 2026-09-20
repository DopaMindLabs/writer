/**
 * The scanning port's contracts. A detector answers "which QR payloads are in
 * this image"; a factory knows how to build one and whether the platform
 * provides it natively. Both are injectable so the application (and every test)
 * can run without a camera or the WASM polyfill.
 */

export interface QrDetector {
  /** Decoded payload text of every QR found in the source, possibly empty. */
  detect: (source: ImageBitmapSource) => Promise<string[]>;
}

export interface QrDetectorFactory {
  create: () => Promise<QrDetector>;
  /** Whether the detector is the platform's own rather than the polyfill. */
  native: boolean;
}

/** How scanning is provided on this browser. */
export type QrScanCapability = 'native' | 'polyfill';

export interface QrScanner {
  capability: () => Promise<QrScanCapability>;
  scanImage: (source: ImageBitmapSource) => Promise<string[]>;
}

export class QrScanError extends Error {
  constructor(reason: string, options?: { cause?: unknown }) {
    super(`QR scanning failed: ${reason}`, options);
    this.name = 'QrScanError';
  }
}
