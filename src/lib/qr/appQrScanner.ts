import zxingReaderWasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';
import { createQrScanner, type QrScanner } from 'writer-qr/scan';

/**
 * Writer's scanner: the package's facade, pointed at a WASM engine this app
 * serves itself.
 *
 * Left to its own devices the ponyfill fetches that engine from a public CDN
 * the first time anything is scanned. Pairing is two devices on one local
 * network, so an internet round trip is both a way for the feature to fail
 * offline and a third party contacted for something entirely local. Bundling
 * the engine removes both.
 */
export const createAppQrScanner = (): QrScanner =>
  createQrScanner({ wasmUrl: zxingReaderWasmUrl });
